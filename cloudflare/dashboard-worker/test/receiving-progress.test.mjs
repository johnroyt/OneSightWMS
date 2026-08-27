import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReceivingProgress } from '../src/receiving-progress.mjs';

test('calculates pending from ordered minus received when stored pending is blank', () => {
    const result = buildReceivingProgress('PO-1', [
        { QtyOrdered: 2, QtyReceived: 2, QtyPending: 0 },
        { QtyOrdered: 1, QtyReceived: null, QtyPending: null }
    ]);

    assert.equal(result.orderedUnits, 3);
    assert.equal(result.receivedUnits, 2);
    assert.equal(result.pendingUnits, 1);
    assert.equal(result.completeLines, 1);
    assert.equal(result.totalLines, 2);
    assert.equal(result.progressPercent, 66.7);
});

test('caps the visual progress bar while preserving over-receipt information', () => {
    const result = buildReceivingProgress('PO-2', [
        { QtyOrdered: 5, QtyReceived: 7 }
    ]);

    assert.equal(result.progressPercent, 140);
    assert.equal(result.progressBarPercent, 100);
    assert.equal(result.pendingUnits, 0);
    assert.equal(result.overReceivedUnits, 2);
});

test('uses the latest valid receipt transaction date', () => {
    const result = buildReceivingProgress('PO-3', [], [
        { TransactionDate: '2026-08-14T10:00:00Z' },
        { CreatedDate: '2026-08-26T18:32:31Z' },
        { TransactionDate: 'not-a-date' }
    ]);

    assert.equal(result.lastReceiptAt, '2026-08-26T18:32:31.000Z');
});
