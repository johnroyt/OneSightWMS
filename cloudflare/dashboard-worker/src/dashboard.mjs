const TERMINAL_ORDER_STATUSES = new Set(['complete', 'completed', 'cancelled', 'canceled']);
const TERMINAL_PO_STATUSES = new Set(['closed', 'cancelled', 'canceled', 'complete', 'completed']);
const TERMINAL_COUNT_STATUSES = new Set(['finalized', 'cancelled', 'canceled', 'complete', 'completed']);

function text(value) {
    return value == null ? '' : String(value).trim();
}

function lower(value) {
    return text(value).toLowerCase();
}

function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function date(value) {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function iso(value) {
    const parsed = value instanceof Date ? value : date(value);
    return parsed ? parsed.toISOString() : null;
}

function dayDiff(later, earlier) {
    if (!later || !earlier) return null;
    return Math.floor((later.getTime() - earlier.getTime()) / 86400000);
}

function isTrue(value) {
    if (value === true || value === 1) return true;
    return ['true', 'yes', '1'].includes(lower(value));
}

function isFalse(value) {
    if (value === false || value === 0 || value == null || value === '') return true;
    return ['false', 'no', '0'].includes(lower(value));
}

function key(...parts) {
    return parts.map(part => text(part).toUpperCase()).join('|');
}

function compactNumber(value) {
    return Math.round(number(value)).toLocaleString('en-US');
}

function countPhrase(value, singular, plural = `${singular}s`) {
    const count = number(value);
    return `${compactNumber(count)} ${count === 1 ? singular : plural}`;
}

function priorityRank(priority) {
    return { urgent: 0, high: 1, medium: 2, low: 3 }[priority] ?? 4;
}

function sortAttention(a, b) {
    const priority = priorityRank(a.priority) - priorityRank(b.priority);
    if (priority) return priority;
    const aDue = date(a.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bDue = date(b.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    if (aDue !== bDue) return aDue - bDue;
    return text(a.title).localeCompare(text(b.title));
}

function productLabel(product, upc) {
    return text(product?.PrettyDescription) || text(product?.UPCDescription) ||
        text(product?.Description) || text(product?.AccountingDesc) || text(upc) || 'Unknown product';
}

function orderDueDate(order) {
    return date(order.DeliverByDate) || date(order.ShipDate) || date(order.EstDeliveryDate);
}

function pickedProgress(items) {
    const totals = items.reduce((acc, item) => {
        const ordered = Math.max(0, number(item.QuantityOrdered));
        const picked = Math.max(0, number(item.QuantityPicked));
        acc.ordered += ordered;
        acc.picked += picked;
        if (picked < ordered) {
            acc.linesRemaining += 1;
            acc.unitsRemaining += ordered - picked;
        }
        if (picked > ordered) acc.overPickedLines += 1;
        if (picked > 0 && picked < ordered) acc.partialLines += 1;
        return acc;
    }, { ordered: 0, picked: 0, linesRemaining: 0, unitsRemaining: 0, partialLines: 0, overPickedLines: 0 });

    totals.percent = totals.ordered > 0
        ? Math.min(100, Math.round((totals.picked / totals.ordered) * 100))
        : 0;
    return totals;
}

function facilityName(facilityMap, facilityId) {
    return text(facilityMap.get(text(facilityId))?.Name) || text(facilityId) || 'Unassigned';
}

function orderContext(order) {
    return text(order.ClinicSaleID) || text(order.OrderContext) || text(order.DonationPartnerName) || 'General transfer';
}

function calendarDateKey(value, timeZone = 'America/Chicago') {
    if (!value) return '';
    if (typeof value === 'string') {
        const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
        const usMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (usMatch) return `${usMatch[3]}-${usMatch[1].padStart(2, '0')}-${usMatch[2].padStart(2, '0')}`;
    }
    const parsed = value instanceof Date ? value : date(value);
    if (!parsed) return '';
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(parsed);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
}

function shiftDateKey(value, days) {
    const [year, month, day] = value.split('-').map(Number);
    const shifted = new Date(Date.UTC(year, month - 1, day + days));
    return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
}

function activityPeriods(now) {
    const today = calendarDateKey(now);
    const [year, month, day] = today.split('-').map(Number);
    const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    return {
        today,
        week: { label: 'This week', start: shiftDateKey(today, -((dayOfWeek + 6) % 7)) },
        month: { label: 'This month', start: `${year}-${String(month).padStart(2, '0')}-01` },
        ytd: { label: 'Year to date', start: `${year}-01-01` }
    };
}

function directoryName(row) {
    return text(row.FullName) || text(`${text(row.First_Name)} ${text(row.Last_Name)}`) || text(row.Email);
}

function displayPersonName(value) {
    const raw = text(value);
    if (!raw || !/^[A-Za-z][A-Za-z '\-]*$/.test(raw)) return raw;
    if (raw !== raw.toUpperCase() && raw !== raw.toLowerCase()) return raw;
    return raw.toLowerCase().replace(/\b[a-z]/g, letter => letter.toUpperCase());
}

function personResolver(directory) {
    const guidNames = new Map();
    const firstNameMatches = new Map();
    for (const row of directory) {
        const name = directoryName(row);
        if (!name) continue;
        if (text(row.UserGUID)) guidNames.set(text(row.UserGUID).toUpperCase(), name);
        const firstName = text(row.First_Name) || name.split(/\s+/)[0];
        if (!firstName) continue;
        const firstKey = firstName.toUpperCase();
        if (!firstNameMatches.has(firstKey)) firstNameMatches.set(firstKey, new Set());
        firstNameMatches.get(firstKey).add(name);
    }

    const resolveSingle = value => {
        const raw = text(value);
        if (!raw) return '';
        const normalized = raw.toUpperCase();
        if (guidNames.has(normalized)) return guidNames.get(normalized);
        const firstKey = raw.split(/\s+/)[0].toUpperCase();
        const matches = firstNameMatches.get(firstKey);
        return matches?.size === 1 ? [...matches][0] : displayPersonName(raw);
    };

    return (primary, fallback) => {
        const direct = resolveSingle(primary);
        if (direct) return direct;
        const rawFallback = text(fallback);
        if (!rawFallback) return 'Unattributed';
        if (!rawFallback.includes('/')) return resolveSingle(rawFallback) || rawFallback;
        return rawFallback.split('/').map(value => resolveSingle(value) || text(value)).join(' / ');
    };
}

function emptyActivityPerson(name) {
    return {
        name,
        pickedUnits: 0,
        pickedLines: 0,
        pickedOrders: new Set(),
        deliveriesLogged: 0,
        trackingNumbers: new Set(),
        poReceivedUnits: 0,
        poReceiptPostings: 0,
        purchaseOrders: new Set()
    };
}

function buildWarehouseActivity(input, now) {
    const orderItems = Array.isArray(input.orderItems) ? input.orderItems : [];
    const receiptLog = Array.isArray(input.receiptLog) ? input.receiptLog : [];
    const activityTransactions = Array.isArray(input.activityTransactions) ? input.activityTransactions : [];
    const directory = Array.isArray(input.directory) ? input.directory : [];
    const resolvePerson = personResolver(directory);
    const periods = activityPeriods(now);

    const buildPeriod = period => {
        const people = new Map();
        const getPerson = name => {
            const displayName = displayPersonName(name) || 'Unattributed';
            const personKey = displayName.toUpperCase();
            if (!people.has(personKey)) people.set(personKey, emptyActivityPerson(displayName));
            return people.get(personKey);
        };
        const totals = emptyActivityPerson('Team total');
        const inPeriod = value => {
            const valueKey = calendarDateKey(value);
            return valueKey && valueKey >= period.start && valueKey <= periods.today;
        };

        for (const item of orderItems) {
            const picked = Math.max(0, number(item.QuantityPicked));
            if (!picked || !item.PickedDateTime || !inPeriod(item.PickedDateTime)) continue;
            const name = resolvePerson(item.PickedByID, 'Unattributed');
            const person = getPerson(name);
            for (const target of [person, totals]) {
                target.pickedUnits += picked;
                target.pickedLines += 1;
                if (text(item.OrderID)) target.pickedOrders.add(text(item.OrderID));
            }
        }

        for (const receipt of receiptLog) {
            if (!inPeriod(receipt.CreatedDate)) continue;
            const name = resolvePerson(receipt.ReceivedByUser, receipt.ReceivedByName);
            const person = getPerson(name);
            for (const target of [person, totals]) {
                target.deliveriesLogged += 1;
                if (text(receipt.TrackingNumber)) target.trackingNumbers.add(text(receipt.TrackingNumber));
            }
        }

        for (const transaction of activityTransactions) {
            if (!/^PO-/i.test(text(transaction.ReferenceNumber))) continue;
            if (!inPeriod(transaction.TransactionDate || transaction.CreatedDate)) continue;
            const name = resolvePerson(transaction.TransactionByCombined || transaction.AdminTransactionBy, 'Unattributed');
            const person = getPerson(name);
            const quantity = Math.max(0, number(transaction.Quantity));
            for (const target of [person, totals]) {
                target.poReceivedUnits += quantity;
                target.poReceiptPostings += 1;
                target.purchaseOrders.add(text(transaction.ReferenceNumber));
            }
        }

        const finalize = person => ({
            name: person.name,
            pickedUnits: person.pickedUnits,
            pickedLines: person.pickedLines,
            pickedOrders: person.pickedOrders.size,
            deliveriesLogged: person.deliveriesLogged,
            trackingNumbers: person.trackingNumbers.size,
            poReceivedUnits: person.poReceivedUnits,
            poReceiptPostings: person.poReceiptPostings,
            purchaseOrders: person.purchaseOrders.size
        });

        return {
            label: period.label,
            totals: finalize(totals),
            people: [...people.values()].map(finalize).sort((a, b) => a.name.localeCompare(b.name))
        };
    };

    return {
        defaultPeriod: 'month',
        periods: {
            week: buildPeriod(periods.week),
            month: buildPeriod(periods.month),
            ytd: buildPeriod(periods.ytd)
        },
        definitions: {
            picking: 'Timestamped order-item picks only; historical imports without pick timestamps are excluded.',
            deliveries: 'Incoming deliveries recorded in the ROC Receipt Log.',
            poReceiving: 'Inventory receipts with a PO reference; donations, returns, recalls, and internal transfers are excluded.'
        }
    };
}

export function buildDashboard(input, options = {}) {
    const now = options.now ? new Date(options.now) : new Date();
    const stagedSlaDays = number(options.stagedSlaDays || 3);
    const countSlaDays = number(options.countSlaDays || 1);
    const readinessDays = number(options.readinessDays || 45);

    const orders = Array.isArray(input.orders) ? input.orders : [];
    const orderItems = Array.isArray(input.orderItems) ? input.orderItems : [];
    const purchaseOrders = Array.isArray(input.purchaseOrders) ? input.purchaseOrders : [];
    const purchaseOrderItems = Array.isArray(input.purchaseOrderItems) ? input.purchaseOrderItems : [];
    const inventoryItems = Array.isArray(input.inventoryItems) ? input.inventoryItems : [];
    const inventoryLocations = Array.isArray(input.inventoryLocations) ? input.inventoryLocations : [];
    const products = Array.isArray(input.products) ? input.products : [];
    const countSessions = Array.isArray(input.countSessions) ? input.countSessions : [];
    const transactions = Array.isArray(input.transactions) ? input.transactions : [];
    const facilities = Array.isArray(input.facilities) ? input.facilities : [];
    const warehouseActivity = buildWarehouseActivity(input, now);

    const facilityMap = new Map(facilities.map(row => [text(row.FacilityId), row]));
    const locationMap = new Map(inventoryLocations.map(row => [text(row.LocationID), row]));
    const productMap = new Map(products.map(row => [text(row.UPC), row]));
    const orderItemsByOrder = new Map();
    const poItemsByPo = new Map();

    for (const item of orderItems) {
        const id = text(item.OrderID);
        if (!orderItemsByOrder.has(id)) orderItemsByOrder.set(id, []);
        orderItemsByOrder.get(id).push(item);
    }
    for (const item of purchaseOrderItems) {
        const id = text(item.PurchaseOrderID);
        if (!poItemsByPo.has(id)) poItemsByPo.set(id, []);
        poItemsByPo.get(id).push(item);
    }

    const activePOs = purchaseOrders.filter(po => !TERMINAL_PO_STATUSES.has(lower(po.Status)));
    const inboundByFacilityProduct = new Map();
    for (const po of activePOs) {
        for (const item of poItemsByPo.get(text(po.PurchaseOrderGUID)) || []) {
            const pending = Math.max(0, number(item.QtyPending) || (number(item.QtyOrdered) - number(item.QtyReceived)));
            const inboundKey = key(po.ToDestination, item.ProductUPC);
            inboundByFacilityProduct.set(inboundKey, (inboundByFacilityProduct.get(inboundKey) || 0) + pending);
        }
    }

    const activeLocation = row => row && lower(row.Status) === 'active' && isFalse(row.DeleteMe);
    const activeProduct = row => row && isTrue(row.Active);
    const shortageRows = [];
    const negativeRows = [];
    let blankQuantityCount = 0;

    for (const item of inventoryItems) {
        const quantityRaw = item.QuantityOnHand;
        const quantity = number(quantityRaw);
        const target = number(item.ModelStockQty);
        const location = locationMap.get(text(item.LocationID));
        const product = productMap.get(text(item.ProductUPC));

        if (quantityRaw == null || text(quantityRaw) === '') blankQuantityCount += 1;
        if (quantity < 0) {
            negativeRows.push({
                upc: text(item.ProductUPC),
                product: productLabel(product, item.ProductUPC),
                productType: text(product?.ProductType),
                location: text(item.LocationID) || 'Unknown location',
                quantity,
                lastTransactionDate: iso(item.LastTransactionDate)
            });
        }

        if (target <= 1 || quantity >= target || !activeLocation(location) || !activeProduct(product)) continue;
        const facilityId = text(location.FacilityId);
        const inbound = inboundByFacilityProduct.get(key(facilityId, item.ProductUPC)) || 0;
        const rawGap = Math.max(0, target - quantity);
        const netGap = Math.max(0, rawGap - inbound);
        if (netGap <= 0) continue;

        shortageRows.push({
            upc: text(item.ProductUPC),
            product: productLabel(product, item.ProductUPC),
            productType: text(product?.ProductType) || 'Unclassified',
            location: text(item.LocationID),
            facilityId,
            facility: facilityName(facilityMap, facilityId),
            onHand: quantity,
            target,
            inbound,
            gap: netGap,
            coveragePercent: Math.max(0, Math.round((quantity / target) * 100)),
            stockout: quantity <= 0
        });
    }

    shortageRows.sort((a, b) => {
        if (a.stockout !== b.stockout) return a.stockout ? -1 : 1;
        if (a.coveragePercent !== b.coveragePercent) return a.coveragePercent - b.coveragePercent;
        return b.gap - a.gap;
    });
    negativeRows.sort((a, b) => a.quantity - b.quantity);

    const inventoryHealthMap = new Map();
    for (const row of shortageRows) {
        const locationKey = row.location || row.facility;
        if (!inventoryHealthMap.has(locationKey)) {
            inventoryHealthMap.set(locationKey, { location: locationKey, facility: row.facility, shortages: 0, stockouts: 0, totalGap: 0, inbound: 0 });
        }
        const summary = inventoryHealthMap.get(locationKey);
        summary.shortages += 1;
        summary.stockouts += row.stockout ? 1 : 0;
        summary.totalGap += row.gap;
        summary.inbound += row.inbound;
    }
    const inventoryHealth = [...inventoryHealthMap.values()]
        .sort((a, b) => b.stockouts - a.stockouts || b.shortages - a.shortages || b.totalGap - a.totalGap)
        .slice(0, 8);

    const operationalOrders = orders.filter(order => {
        const status = lower(order.OrderStatus);
        return status !== 'draft' && !TERMINAL_ORDER_STATUSES.has(status);
    });
    const readyOrders = operationalOrders.filter(order => lower(order.OrderStatus) === 'ready to pick');
    const stagedOrders = operationalOrders.filter(order => date(order.StagedMovedStamp) && !date(order.CompletedMovedStamp));
    const openCounts = countSessions.filter(session => !TERMINAL_COUNT_STATUSES.has(lower(session.Status)));

    const poSummaries = activePOs.map(po => {
        const items = poItemsByPo.get(text(po.PurchaseOrderGUID)) || [];
        const pendingLines = items.filter(item => Math.max(0, number(item.QtyPending) || (number(item.QtyOrdered) - number(item.QtyReceived))) > 0);
        const pendingUnits = pendingLines.reduce((sum, item) => sum + Math.max(0, number(item.QtyPending) || (number(item.QtyOrdered) - number(item.QtyReceived))), 0);
        const needBy = date(po.NeedByDate);
        return {
            id: text(po.PurchaseOrderGUID),
            vendor: text(po.Vendor) || 'Vendor not set',
            status: text(po.Status) || 'Open',
            destination: facilityName(facilityMap, po.ToDestination),
            needByDate: iso(needBy),
            overdue: Boolean(needBy && needBy < now),
            pendingLines: pendingLines.length,
            pendingUnits
        };
    });

    const attention = [];
    for (const order of readyOrders) {
        const progress = pickedProgress(orderItemsByOrder.get(text(order.OrderID)) || []);
        const due = orderDueDate(order);
        const overdue = Boolean(due && due < now);
        attention.push({
            id: `pick-${text(order.OrderID)}`,
            priority: overdue || isTrue(order.IsRushOrder) ? 'urgent' : 'high',
            type: 'Ready to pick',
            title: text(order.OrderID),
            context: orderContext(order),
            detail: `${progress.linesRemaining} lines / ${compactNumber(progress.unitsRemaining)} units remaining`,
            dueDate: iso(due),
            owner: 'Warehouse',
            actionLabel: 'Start or resume pick',
            actionUrl: `pages/picking/details.html?OrderID=${encodeURIComponent(text(order.OrderID))}`
        });
    }

    for (const order of stagedOrders) {
        const stagedAt = date(order.StagedMovedStamp);
        const ageDays = dayDiff(now, stagedAt);
        attention.push({
            id: `staged-${text(order.OrderID)}`,
            priority: ageDays >= stagedSlaDays ? 'urgent' : 'high',
            type: 'Staged / in transit',
            title: text(order.OrderID),
            context: `${facilityName(facilityMap, order.SourceFacilityID)} → ${facilityName(facilityMap, order.DestinationFacilityID)}`,
            detail: `${orderContext(order)} · staged ${ageDays ?? 0} day${ageDays === 1 ? '' : 's'} ago`,
            dueDate: iso(orderDueDate(order)),
            ageDays,
            owner: 'Receiving location',
            actionLabel: 'Review order',
            actionUrl: `pages/orders/details.html?OrderID=${encodeURIComponent(text(order.OrderID))}`
        });
    }

    for (const order of operationalOrders) {
        const progress = pickedProgress(orderItemsByOrder.get(text(order.OrderID)) || []);
        if (progress.partialLines === 0 && progress.overPickedLines === 0) continue;
        if (readyOrders.includes(order)) continue;
        attention.push({
            id: `partial-${text(order.OrderID)}`,
            priority: progress.overPickedLines > 0 ? 'urgent' : 'high',
            type: progress.overPickedLines > 0 ? 'Over-picked items' : 'Partial pick',
            title: text(order.OrderID),
            context: orderContext(order),
            detail: progress.overPickedLines > 0
                ? `${progress.overPickedLines} over-picked line${progress.overPickedLines === 1 ? '' : 's'}`
                : `${progress.partialLines} partial line${progress.partialLines === 1 ? '' : 's'} · ${compactNumber(progress.unitsRemaining)} units remaining`,
            dueDate: iso(orderDueDate(order)),
            owner: 'Warehouse',
            actionLabel: 'Review pick',
            actionUrl: `pages/picking/details.html?OrderID=${encodeURIComponent(text(order.OrderID))}`
        });
    }

    for (const po of poSummaries) {
        if (!po.overdue && lower(po.status) !== 'partially received') continue;
        attention.push({
            id: `po-${po.id}`,
            priority: po.overdue ? 'urgent' : 'high',
            type: po.overdue ? 'Overdue receiving' : 'Partial receipt',
            title: po.id,
            context: `${po.vendor} → ${po.destination}`,
            detail: `${countPhrase(po.pendingLines, 'line')} / ${countPhrase(po.pendingUnits, 'unit')} pending`,
            dueDate: po.needByDate,
            owner: 'Purchasing / Warehouse',
            actionLabel: 'Receive items',
            actionUrl: `pages/purchase-orders/details.html?PurchaseOrderID=${encodeURIComponent(po.id)}`
        });
    }

    for (const session of openCounts) {
        const started = date(session.CreatedDate);
        const ageDays = dayDiff(now, started);
        attention.push({
            id: `count-${text(session.SessionID)}`,
            priority: ageDays >= countSlaDays ? 'high' : 'medium',
            type: 'Open count session',
            title: text(session.StartLocationID) || text(session.SessionID),
            context: text(session.CreatedBy) || 'Inventory team',
            detail: `${text(session.Status) || 'Open'} · started ${ageDays ?? 0} day${ageDays === 1 ? '' : 's'} ago`,
            dueDate: null,
            ageDays,
            owner: text(session.CreatedBy) || 'Inventory team',
            actionLabel: 'Resume count',
            actionUrl: `pages/inventory/scanner.html?SessionID=${encodeURIComponent(text(session.SessionID))}`
        });
    }

    for (const row of negativeRows.slice(0, 5)) {
        attention.push({
            id: `negative-${row.upc}-${row.location}`,
            priority: 'urgent',
            type: 'Negative on hand',
            title: row.product,
            context: `${row.location} · ${row.productType || row.upc}`,
            detail: `${compactNumber(row.quantity)} units on hand`,
            dueDate: null,
            owner: 'Inventory owner',
            actionLabel: 'Review inventory',
            actionUrl: 'pages/inventory/index.html'
        });
    }
    attention.sort(sortAttention);

    const readinessCutoff = new Date(now.getTime() + readinessDays * 86400000);
    const readiness = orders
        .filter(order => {
            const due = orderDueDate(order);
            return due && due >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) && due <= readinessCutoff && !TERMINAL_ORDER_STATUSES.has(lower(order.OrderStatus));
        })
        .map(order => {
            const progress = pickedProgress(orderItemsByOrder.get(text(order.OrderID)) || []);
            const status = text(order.OrderStatus) || 'Draft';
            const facilityId = text(order.DestinationFacilityID);
            const destinationShortages = shortageRows.filter(row => row.facilityId === facilityId);
            const inboundUnits = poSummaries
                .filter(po => text(purchaseOrders.find(raw => text(raw.PurchaseOrderGUID) === po.id)?.ToDestination) === facilityId)
                .reduce((sum, po) => sum + po.pendingUnits, 0);
            return {
                orderId: text(order.OrderID),
                name: orderContext(order),
                destination: facilityName(facilityMap, facilityId),
                dueDate: iso(orderDueDate(order)),
                daysUntilDue: dayDiff(orderDueDate(order), now),
                status,
                rush: isTrue(order.IsRushOrder),
                pickedPercent: progress.percent,
                linesRemaining: progress.linesRemaining,
                criticalShortages: destinationShortages.filter(row => row.stockout).length,
                shortageCount: destinationShortages.length,
                inboundUnits,
                actionUrl: lower(status) === 'ready to pick'
                    ? `pages/picking/details.html?OrderID=${encodeURIComponent(text(order.OrderID))}`
                    : `pages/orders/details.html?OrderID=${encodeURIComponent(text(order.OrderID))}`
            };
        })
        .sort((a, b) => date(a.dueDate) - date(b.dueDate))
        .slice(0, 12);

    const recentMovements = transactions
        .slice()
        .sort((a, b) => (date(b.TransactionDate) || date(b.CreatedDate) || 0) - (date(a.TransactionDate) || date(a.CreatedDate) || 0))
        .slice(0, 15)
        .map(row => {
            const product = productMap.get(text(row.ItemUPC));
            return {
                id: text(row.TransactionID),
                type: text(row.TransactionType) || 'Transaction',
                date: iso(row.TransactionDate || row.CreatedDate),
                product: productLabel(product, row.ItemUPC),
                productType: text(product?.ProductType) || 'Unclassified',
                upc: text(row.ItemUPC),
                quantity: number(row.Quantity),
                before: row.QuantityBeforeTransaction == null ? null : number(row.QuantityBeforeTransaction),
                after: row.QuantityAfterTransaction == null ? null : number(row.QuantityAfterTransaction),
                fromLocation: text(row.FromLocation),
                location: text(row.LocationID),
                reference: text(row.ReferenceNumber) || text(row.ClinicID) || text(row.OrderGUID),
                actor: text(row.TransactionByCombined) || text(row.AdminTransactionBy) || text(row.ClinicTransactionBy)
            };
        });

    const readyProgress = readyOrders.reduce((acc, order) => {
        const progress = pickedProgress(orderItemsByOrder.get(text(order.OrderID)) || []);
        acc.lines += progress.linesRemaining;
        acc.units += progress.unitsRemaining;
        return acc;
    }, { lines: 0, units: 0 });
    const stagedOverSla = stagedOrders.filter(order => dayDiff(now, date(order.StagedMovedStamp)) >= stagedSlaDays).length;
    const overduePOs = poSummaries.filter(po => po.overdue).length;
    const poPendingUnits = poSummaries.reduce((sum, po) => sum + po.pendingUnits, 0);
    const oldCounts = openCounts.filter(session => dayDiff(now, date(session.CreatedDate)) >= countSlaDays).length;
    const criticalStockouts = shortageRows.filter(row => row.stockout).length;

    return {
        asOf: now.toISOString(),
        definitions: {
            stagedSlaDays,
            countSlaDays,
            readinessDays,
            shortageScope: 'Active products and active non-deleted locations with model-stock targets greater than 1; confirmed inbound is subtracted.'
        },
        cards: {
            readyToPick: { value: readyOrders.length, detail: `${readyProgress.lines} lines / ${compactNumber(readyProgress.units)} units remaining`, tone: readyOrders.length ? 'attention' : 'good' },
            staged: { value: stagedOrders.length, detail: `${stagedOverSla} beyond ${stagedSlaDays}-day target`, tone: stagedOverSla ? 'danger' : stagedOrders.length ? 'attention' : 'good' },
            receiving: { value: activePOs.length, detail: `${overduePOs} overdue · ${countPhrase(poPendingUnits, 'unit')} pending`, tone: overduePOs ? 'danger' : activePOs.length ? 'attention' : 'good' },
            counts: { value: openCounts.length, detail: `${oldCounts} older than ${countSlaDays} day`, tone: oldCounts ? 'attention' : 'good' },
            inventoryExceptions: { value: criticalStockouts, detail: `${negativeRows.length} negative balances`, tone: criticalStockouts || negativeRows.length ? 'danger' : 'good' }
        },
        attention: attention.slice(0, 40),
        readiness,
        shortages: shortageRows.slice(0, 20),
        shortageSummary: {
            total: shortageRows.length,
            stockouts: criticalStockouts
        },
        inventoryHealth,
        countHealth: {
            openSessions: openCounts.length,
            olderThanTarget: oldCounts,
            negativeBalances: negativeRows.length,
            blankQuantities: blankQuantityCount,
            topNegativeBalances: negativeRows.slice(0, 10)
        },
        warehouseActivity,
        recentMovements,
        sourceCounts: {
            orders: orders.length,
            orderItems: orderItems.length,
            purchaseOrders: purchaseOrders.length,
            purchaseOrderItems: purchaseOrderItems.length,
            inventoryItems: inventoryItems.length,
            inventoryLocations: inventoryLocations.length,
            products: products.length,
            countSessions: countSessions.length,
            transactions: transactions.length,
            facilities: facilities.length,
            receiptLog: Array.isArray(input.receiptLog) ? input.receiptLog.length : 0,
            activityTransactions: Array.isArray(input.activityTransactions) ? input.activityTransactions.length : 0,
            directory: Array.isArray(input.directory) ? input.directory.length : 0
        }
    };
}
