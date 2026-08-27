import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDashboard } from '../src/dashboard.mjs';

const base = {
    orders: [], orderItems: [], purchaseOrders: [], purchaseOrderItems: [],
    inventoryItems: [], inventoryLocations: [], products: [], countSessions: [],
    transactions: [], facilities: [], receiptLog: [], activityTransactions: [], directory: []
};

test('separates warehouse-ready orders from draft planning orders', () => {
    const result = buildDashboard({
        ...base,
        orders: [
            { OrderID: 'READY-1', OrderStatus: 'Ready to Pick', DeliverByDate: '2026-08-28', DestinationFacilityID: 'F1' },
            { OrderID: 'DRAFT-1', OrderStatus: 'Draft', DeliverByDate: '2026-08-29', DestinationFacilityID: 'F1' }
        ],
        orderItems: [
            { OrderID: 'READY-1', QuantityOrdered: 10, QuantityPicked: 2 },
            { OrderID: 'DRAFT-1', QuantityOrdered: 25, QuantityPicked: 0 }
        ],
        facilities: [{ FacilityId: 'F1', Name: '4 Lane Pod' }]
    }, { now: '2026-08-27T12:00:00Z' });

    assert.equal(result.cards.readyToPick.value, 1);
    assert.equal(result.attention.filter(item => item.type === 'Ready to pick').length, 1);
    assert.equal(result.readiness.length, 2);
});

test('treats staged inventory as in transit until completion is recorded', () => {
    const result = buildDashboard({
        ...base,
        orders: [
            { OrderID: 'STAGED-1', OrderStatus: 'Staged', StagedMovedStamp: '2026-08-20', SourceFacilityID: 'ROC', DestinationFacilityID: 'POD' },
            { OrderID: 'DONE-1', OrderStatus: 'Complete', StagedMovedStamp: '2026-08-20', CompletedMovedStamp: '2026-08-21' }
        ],
        facilities: [{ FacilityId: 'ROC', Name: 'ROC' }, { FacilityId: 'POD', Name: '6 Lane Pod' }]
    }, { now: '2026-08-27T12:00:00Z', stagedSlaDays: 3 });

    assert.equal(result.cards.staged.value, 1);
    assert.equal(result.cards.staged.tone, 'danger');
    assert.equal(result.attention[0].type, 'Staged / in transit');
});

test('scopes shortages to active products and locations and subtracts inbound', () => {
    const result = buildDashboard({
        ...base,
        facilities: [{ FacilityId: 'F1', Name: '4 Lane Pod' }],
        inventoryLocations: [
            { LocationID: 'Active Pod', FacilityId: 'F1', Status: 'Active', DeleteMe: false },
            { LocationID: 'Old Pod', FacilityId: 'F2', Status: 'Inactive', DeleteMe: false }
        ],
        products: [
            { UPC: 'A', PrettyDescription: 'Readers', ProductType: 'Readers', Active: true },
            { UPC: 'B', PrettyDescription: 'Old Item', Active: false }
        ],
        inventoryItems: [
            { ProductUPC: 'A', LocationID: 'Active Pod', QuantityOnHand: 0, ModelStockQty: 10 },
            { ProductUPC: 'A', LocationID: 'Old Pod', QuantityOnHand: 0, ModelStockQty: 10 },
            { ProductUPC: 'B', LocationID: 'Active Pod', QuantityOnHand: 0, ModelStockQty: 10 },
            { ProductUPC: 'A', LocationID: 'Active Pod', QuantityOnHand: 0, ModelStockQty: 1 }
        ],
        purchaseOrders: [{ PurchaseOrderGUID: 'PO-1', Status: 'Partially Received', ToDestination: 'F1' }],
        purchaseOrderItems: [{ PurchaseOrderID: 'PO-1', ProductUPC: 'A', QtyOrdered: 10, QtyReceived: 4, QtyPending: 6 }]
    }, { now: '2026-08-27T12:00:00Z' });

    assert.equal(result.shortages.length, 1);
    assert.equal(result.shortages[0].gap, 4);
    assert.equal(result.shortages[0].inbound, 6);
});

test('surfaces overdue partially received purchase orders', () => {
    const result = buildDashboard({
        ...base,
        purchaseOrders: [{ PurchaseOrderGUID: 'PO-1', Status: 'Partially Received', NeedByDate: '2026-08-20', ToDestination: 'F1', Vendor: 'Vendor' }],
        purchaseOrderItems: [{ PurchaseOrderID: 'PO-1', ProductUPC: 'A', QtyOrdered: 20, QtyReceived: 15, QtyPending: 5 }],
        facilities: [{ FacilityId: 'F1', Name: 'Optical Prime' }]
    }, { now: '2026-08-27T12:00:00Z' });

    assert.equal(result.cards.receiving.value, 1);
    assert.match(result.cards.receiving.detail, /1 overdue/);
    assert.equal(result.attention[0].type, 'Overdue receiving');
    assert.equal(result.attention[0].detail, '1 line / 5 units pending');
});

test('treats a blank received quantity as zero pending units', () => {
    const result = buildDashboard({
        ...base,
        purchaseOrders: [{ PurchaseOrderGUID: 'PO-BLANK', Status: 'Partially Received', NeedByDate: '2026-08-20' }],
        purchaseOrderItems: [{ PurchaseOrderID: 'PO-BLANK', ProductUPC: 'A', QtyOrdered: 1, QtyReceived: null, QtyPending: null }]
    }, { now: '2026-08-27T12:00:00Z' });

    assert.equal(result.attention[0].type, 'Overdue receiving');
    assert.equal(result.attention[0].detail, '1 line / 1 unit pending');
    assert.equal(result.cards.receiving.detail, '1 overdue · 1 unit pending');
});

test('builds team activity by period without counting imported historical picks', () => {
    const result = buildDashboard({
        ...base,
        orderItems: [
            { OrderID: 'CURRENT-1', QuantityPicked: 100, PickedByID: 'DORA', PickedDateTime: '2026-08-26T10:00:00' },
            { OrderID: 'CURRENT-2', QuantityPicked: 50, PickedByID: 'SHAWN', PickedDateTime: '2026-08-20T10:00:00' },
            { OrderID: 'IMPORTED-1', QuantityPicked: 5000, PickedByID: 'DORA', PickedDateTime: null }
        ],
        receiptLog: [
            { ReceiptID: 'R1', ReceivedByName: 'DORA', TrackingNumber: 'TRACK-1', CreatedDate: '2026-08-26T11:00:00' },
            { ReceiptID: 'R2', ReceivedByName: 'TORI', TrackingNumber: 'TRACK-2', CreatedDate: '2026-08-25T11:00:00' },
            { ReceiptID: 'R3', ReceivedByName: 'tori', TrackingNumber: 'TRACK-3', CreatedDate: '2026-08-25T12:00:00' }
        ],
        activityTransactions: [
            { TransactionID: 'T1', Quantity: 300, ReferenceNumber: 'PO-1', TransactionDate: '2026-08-26T12:00:00', TransactionByCombined: 'SHAWN' },
            { TransactionID: 'T2', Quantity: 900, ReferenceNumber: '', TransactionDate: '2026-08-26T12:30:00', TransactionByCombined: 'DORA' }
        ],
        directory: [
            { UserGUID: 'DORA', FullName: 'Dora Halbert', First_Name: 'Dora' },
            { UserGUID: 'SHAWN', FullName: 'Shawn Lewis', First_Name: 'Shawn' },
            { UserGUID: 'TORI', FullName: 'Tori Example', First_Name: 'Tori' }
        ]
    }, { now: '2026-08-27T12:00:00Z' });

    const week = result.warehouseActivity.periods.week;
    const month = result.warehouseActivity.periods.month;
    assert.equal(week.totals.pickedUnits, 100);
    assert.equal(month.totals.pickedUnits, 150);
    assert.equal(month.totals.pickedOrders, 2);
    assert.equal(month.totals.deliveriesLogged, 3);
    assert.equal(month.totals.trackingNumbers, 3);
    assert.equal(month.totals.poReceivedUnits, 300);
    assert.equal(month.totals.purchaseOrders, 1);
    assert.equal(month.people.find(person => person.name === 'Dora Halbert').pickedUnits, 100);
    assert.equal(month.people.find(person => person.name === 'Tori Example').deliveriesLogged, 2);
    assert.equal(month.people.filter(person => person.name.toLowerCase().startsWith('tori')).length, 1);
});
