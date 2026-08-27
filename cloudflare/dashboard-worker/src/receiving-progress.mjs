function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function latestDate(transactions) {
    let latest = null;
    for (const row of transactions || []) {
        const value = row.TransactionDate || row.CreatedDate;
        if (!value) continue;
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) continue;
        if (!latest || parsed > latest) latest = parsed;
    }
    return latest ? latest.toISOString() : null;
}

export function buildReceivingProgress(purchaseOrderId, items = [], transactions = []) {
    const orderedUnits = items.reduce((sum, row) => sum + number(row.QtyOrdered), 0);
    const receivedUnits = items.reduce((sum, row) => sum + number(row.QtyReceived), 0);
    const pendingUnits = Math.max(orderedUnits - receivedUnits, 0);
    const overReceivedUnits = Math.max(receivedUnits - orderedUnits, 0);
    const totalLines = items.length;
    const completeLines = items.filter(row => number(row.QtyReceived) >= number(row.QtyOrdered)).length;
    const progressPercent = orderedUnits > 0
        ? Math.round((receivedUnits / orderedUnits) * 1000) / 10
        : 0;

    return {
        purchaseOrderId,
        orderedUnits,
        receivedUnits,
        pendingUnits,
        overReceivedUnits,
        totalLines,
        completeLines,
        progressPercent,
        progressBarPercent: Math.max(0, Math.min(100, progressPercent)),
        lastReceiptAt: latestDate(transactions)
    };
}
