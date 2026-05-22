/**
 * Cloudflare Worker snippet — paste this block into the worker's main
 * request handler, alongside the existing "search_sp" / "update_order" blocks.
 *
 * Prerequisites already present in the worker:
 *   - CASPIO_TOKEN_URL, CASPIO_CLIENT_ID, CASPIO_CLIENT_SECRET env vars
 *   - getCaspioToken() helper that returns a Bearer token string
 */

if (body.action === 'insert_chatter') {
    const { RecordID, RecordType, ContextURL, MessageBody, RecipientGUID, SenderGUID } = body;

    if (!MessageBody) {
        return new Response(JSON.stringify({ message: 'MessageBody is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    let token;
    try {
        token = await getCaspioToken();
    } catch (e) {
        return new Response(JSON.stringify({ stage: 'auth', message: e.message }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const insertRes = await fetch(
        'https://c2ect483.caspio.com/rest/v2/tables/ContextMessage/records',
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                RecordID:      RecordID      || '',
                RecordType:    RecordType    || 'General',
                ContextURL:    ContextURL    || '',
                MessageBody:   MessageBody,
                RecipientGUID: RecipientGUID || '',
                SenderGUID:    SenderGUID    || ''
            })
        }
    );

    const insertData = await insertRes.json().catch(() => ({}));

    if (!insertRes.ok) {
        return new Response(JSON.stringify({
            stage: 'caspio_insert',
            message: 'Caspio insert failed',
            caspioResponse: insertData
        }), {
            status: 502,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
    }

    return new Response(JSON.stringify({ ok: true, result: insertData }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
}
