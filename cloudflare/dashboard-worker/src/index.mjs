import { buildDashboard } from './dashboard.mjs';
import { buildReceivingProgress } from './receiving-progress.mjs';

let tokenCache = { value: '', expiresAt: 0 };

const DATASETS = {
    orders: {
        table: 'NAWMS_Orders',
        select: 'OrderID,OrderStatus,OrderType,ClinicSaleID,OrderContext,DonationPartnerName,DestinationFacilityID,SourceFacilityID,ShipDate,EstDeliveryDate,DeliverByDate,StagedMovedStamp,CompletedMovedStamp,IsRushOrder,RushReason,ModifiedDate'
    },
    orderItems: {
        table: 'OrderItems',
        select: 'OrderItemId,OrderID,ProductUPC,QuantityOrdered,QuantityPicked,PickStatus,PickedByID,PickedDateTime,PickLocation'
    },
    purchaseOrders: {
        table: 'NAWMS_PurchaseOrders',
        select: 'PurchaseOrderGUID,Vendor,Status,OrderDate,NeedByDate,ToDestination,LastModifiedDate',
        where: "Status<>'Closed' AND Status<>'Cancelled'"
    },
    purchaseOrderItems: {
        table: 'NAWMS_PurchaseOrderItems',
        select: 'PurchaseOrderItemID,PurchaseOrderID,ProductUPC,QtyOrdered,QtyReceived,QtyPending,ModifiedDate',
        where: 'QtyPending>0 OR QtyReceived<QtyOrdered OR QtyReceived IS NULL'
    },
    inventoryItems: {
        table: 'InventoryItems',
        select: 'InventoryItemID,ProductUPC,LocationID,QuantityOnHand,Status,ModelStockQty,LastTransactionDate,ModelStockVariance',
        where: 'QuantityOnHand<ModelStockQty OR QuantityOnHand<0 OR QuantityOnHand IS NULL'
    },
    inventoryLocations: {
        table: 'InventoryLocations',
        select: 'LocationID,FacilityId,LocationType,Status,ParentLocationId,DeleteMe',
        where: "Status='Active' AND (DeleteMe=0 OR DeleteMe IS NULL)"
    },
    products: {
        table: 'Products',
        select: 'UPC,Description,ProductType,AccountingDesc,ProductCategory,Active,UPCDescription,PrettyDescription',
        where: 'Active=1'
    },
    countSessions: {
        table: 'WMS_Count_Session',
        select: 'SessionID,Status,CreatedDate,ModifiedDate,StartLocationID,CreatedBy',
        where: "Status<>'Finalized' AND Status<>'Cancelled'"
    },
    transactions: {
        table: 'InventoryTransaction',
        select: 'TransactionID,ItemUPC,LocationID,TransactionType,Quantity,ReferenceNumber,TransactionDate,CreatedDate,ClinicID,OrderGUID,TransactionByCombined,AdminTransactionBy,ClinicTransactionBy,FromLocation,QuantityBeforeTransaction,QuantityAfterTransaction',
        orderBy: 'TransactionDate DESC',
        pageSize: 25,
        maxPages: 1,
        allowTruncate: true
    },
    receiptLog: {
        table: 'ROCReceiptLog',
        select: 'ReceiptID,ReceivedByName,ReceivedByUser,TrackingNumber,CreatedDate'
    },
    activityTransactions: {
        table: 'InventoryTransaction',
        select: 'TransactionID,TransactionType,Quantity,ReferenceNumber,TransactionDate,CreatedDate,TransactionByCombined,AdminTransactionBy'
    },
    directory: {
        table: 'OSELF_INTERNAL_Directory',
        select: 'UserGUID,FullName,First_Name,Last_Name,Email'
    },
    facilities: {
        table: 'Facilities',
        select: 'Name,FacilityType,FacilityId,Active',
        where: 'Active=1'
    }
};

function json(body, status = 200, headers = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'X-Content-Type-Options': 'nosniff',
            ...headers
        }
    });
}

function allowedOrigins(env) {
    return String(env.ALLOWED_ORIGINS || '')
        .split(',')
        .map(value => value.trim())
        .filter(Boolean);
}

function corsHeaders(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = allowedOrigins(env);
    if (!allowed.includes(origin)) return null;
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin'
    };
}

async function getCaspioToken(env) {
    if (tokenCache.value && Date.now() < tokenCache.expiresAt) return tokenCache.value;
    const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: env.CASPIO_READONLY_CLIENT_ID,
        client_secret: env.CASPIO_READONLY_CLIENT_SECRET
    });
    const response = await fetch(env.CASPIO_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.access_token) {
        throw new Error(`Caspio authentication failed (${response.status})`);
    }
    const expiresIn = Math.max(60, Number(payload.expires_in) || 3600);
    tokenCache = {
        value: payload.access_token,
        expiresAt: Date.now() + Math.max(30000, (expiresIn - 60) * 1000)
    };
    return tokenCache.value;
}

async function fetchRecords(env, token, dataset) {
    const records = [];
    const pageSize = Math.min(1000, dataset.pageSize || 1000);
    const maxPages = Math.min(25, dataset.maxPages || 15);

    for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
        const url = new URL(`${env.CASPIO_API_BASE_URL}/tables/${encodeURIComponent(dataset.table)}/records`);
        url.searchParams.set('q.select', dataset.select);
        url.searchParams.set('q.pageSize', String(pageSize));
        url.searchParams.set('q.pageNumber', String(pageNumber));
        if (dataset.where) url.searchParams.set('q.where', dataset.where);
        if (dataset.orderBy) url.searchParams.set('q.orderBy', dataset.orderBy);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            const detail = payload.Message || payload.message || payload.Error || payload.error;
            throw new Error(`Caspio ${dataset.table} query failed (${response.status})${detail ? `: ${detail}` : ''}`);
        }
        const batch = Array.isArray(payload.Result) ? payload.Result : [];
        records.push(...batch);
        if (batch.length < pageSize) break;
        if (pageNumber === maxPages) {
            if (dataset.allowTruncate) break;
            throw new Error(`Caspio ${dataset.table} exceeded the ${maxPages * pageSize} row safety limit`);
        }
    }
    return records;
}

async function loadDashboardData(env) {
    const token = await getCaspioToken(env);
    const year = new Date().getUTCFullYear();
    const ytdStart = `01/01/${year}`;
    const datasets = {
        ...DATASETS,
        receiptLog: { ...DATASETS.receiptLog, where: `CreatedDate>='${ytdStart}'` },
        activityTransactions: {
            ...DATASETS.activityTransactions,
            where: `TransactionType='Receive' AND TransactionDate>='${ytdStart}'`
        }
    };
    const entries = await Promise.all(Object.entries(datasets).map(async ([name, dataset]) => {
        const rows = await fetchRecords(env, token, dataset);
        return [name, rows];
    }));
    return Object.fromEntries(entries);
}

async function dashboardPayload(env, request, context) {
    const force = new URL(request.url).searchParams.get('refresh') === '1';
    const cacheKey = new Request('https://onesight-wms-dashboard-cache.internal/v3');
    if (!force) {
        const cached = await caches.default.match(cacheKey);
        if (cached) return cached.json();
    }

    const data = await loadDashboardData(env);
    const payload = buildDashboard(data, {
        stagedSlaDays: env.STAGED_SLA_DAYS,
        countSlaDays: env.COUNT_SLA_DAYS,
        readinessDays: env.READINESS_DAYS
    });
    const cacheResponse = json(payload, 200, { 'Cache-Control': 'public, max-age=120' });
    context.waitUntil(caches.default.put(cacheKey, cacheResponse));
    return payload;
}

function sqlString(value) {
    return `'${String(value).replaceAll("'", "''")}'`;
}

async function receivingProgressPayload(env, purchaseOrderId) {
    const token = await getCaspioToken(env);
    const po = sqlString(purchaseOrderId);
    const [purchaseOrders, items, transactions] = await Promise.all([
        fetchRecords(env, token, {
            table: 'NAWMS_PurchaseOrders',
            select: 'PurchaseOrderGUID,Status',
            where: `PurchaseOrderGUID=${po}`,
            pageSize: 5,
            maxPages: 1,
            allowTruncate: true
        }),
        fetchRecords(env, token, {
            table: 'NAWMS_PurchaseOrderItems',
            select: 'PurchaseOrderItemID,PurchaseOrderID,QtyOrdered,QtyReceived',
            where: `PurchaseOrderID=${po}`,
            pageSize: 1000,
            maxPages: 5
        }),
        fetchRecords(env, token, {
            table: 'InventoryTransaction',
            select: 'TransactionDate,CreatedDate',
            where: `TransactionType='Receive' AND ReferenceNumber=${po}`,
            orderBy: 'TransactionDate DESC',
            pageSize: 5,
            maxPages: 1,
            allowTruncate: true
        })
    ]);

    if (!purchaseOrders.length) return null;
    return {
        ...buildReceivingProgress(purchaseOrderId, items, transactions),
        status: String(purchaseOrders[0].Status || '')
    };
}

export default {
    async fetch(request, env, context) {
        const url = new URL(request.url);
        if (url.pathname === '/health') {
            return json({ ok: true, service: 'onesight-wms-dashboard', time: new Date().toISOString() }, 200, {
                'Cache-Control': 'no-store'
            });
        }

        const cors = corsHeaders(request, env);
        if (request.method === 'OPTIONS') {
            return cors ? new Response(null, { status: 204, headers: cors }) : json({ error: 'Origin not allowed' }, 403);
        }
        if (request.method !== 'GET') {
            return json({ error: 'Not found' }, 404);
        }
        if (!cors) return json({ error: 'Origin not allowed' }, 403);

        try {
            const progressMatch = url.pathname.match(/^\/purchase-orders\/([^/]+)\/receiving-progress$/);
            if (progressMatch) {
                const purchaseOrderId = decodeURIComponent(progressMatch[1]);
                if (!/^[A-Za-z0-9_-]{1,80}$/.test(purchaseOrderId)) {
                    return json({ error: 'Invalid purchase order ID.' }, 400, cors);
                }
                const payload = await receivingProgressPayload(env, purchaseOrderId);
                if (!payload) return json({ error: 'Purchase order not found.' }, 404, cors);
                return json(payload, 200, { ...cors, 'Cache-Control': 'private, max-age=15' });
            }

            if (url.pathname !== '/dashboard') return json({ error: 'Not found' }, 404, cors);
            const payload = await dashboardPayload(env, request, context);
            return json(payload, 200, {
                ...cors,
                'Cache-Control': 'private, max-age=30'
            });
        } catch (error) {
            console.error('Dashboard load failed', error);
            return json({
                error: 'Dashboard data is temporarily unavailable.',
                requestId: request.headers.get('cf-ray') || null
            }, 502, { ...cors, 'Cache-Control': 'no-store' });
        }
    }
};
