/**
 * Cloudflare Worker snippet — paste this block into the worker's main
 * request handler, alongside the existing "insert_chatter" / "search_sp"
 * blocks.
 *
 * Prerequisites already present in the worker (same ones Chatter uses):
 *   - CASPIO_TOKEN_URL, CASPIO_CLIENT_ID, CASPIO_CLIENT_SECRET env vars
 *   - getCaspioToken() helper that returns a Bearer token string
 *   - CORS_HEADERS constant
 *   - The X-App-Access-Key gate the frontend already sends
 *
 * Frontend calls it exactly like the Chatter "get_users" action:
 *   fetch(WORKER_URL, {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json',
 *                'X-App-Access-Key': APP_ACCESS_KEY },
 *     body: JSON.stringify({ action: 'get_pod_schedule' })
 *   })
 *
 * Design note: this returns the RAW Caspio field values (dates may be real
 * date strings OR free text). The frontend is responsible for parsing /
 * normalizing and applying business-day fallbacks. Keep it that way so the
 * fallback rules can change without a worker redeploy.
 */

if (body.action === 'get_pod_schedule') {
    let token;
    try {
        token = await getCaspioToken();
    } catch (e) {
        return new Response(JSON.stringify({ stage: 'auth', message: e.message }), {
            status: 502,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
    }

    // Only the columns the schedule view needs. Pod field is Clinic_equip_set.
    const SELECT = [
        'ClinicName',            // adjust if the clinic label column is named differently
        'Clinic_equip_set',      // the pod / equipment set (dropdown -> unique text id)
        'ClinicStartDate',
        'ClinicEndDate',
        'Equipment_Vehicle_Depart', // truck leaves warehouse with the gear
        'Clinic_PickUp_Date'        // truck collects gear after the clinic
    ].join(',');

    const TABLE = 'Clinic_Setup_and_Results';
    const PAGE_SIZE = 1000; // Caspio v2 max per page

    // Pull every clinic that has a pod assigned. Date columns are a mix of
    // real date fields and text, so we DON'T filter by date server-side
    // (unreliable) — the frontend windows/filters instead.
    const records = [];
    let pageNumber = 1;

    try {
        while (true) {
            const url =
                `https://c2ect483.caspio.com/rest/v2/tables/${TABLE}/records` +
                `?q.select=${encodeURIComponent(SELECT)}` +
                `&q.where=${encodeURIComponent('Clinic_equip_set IS NOT NULL')}` +
                `&q.pageSize=${PAGE_SIZE}` +
                `&q.pageNumber=${pageNumber}`;

            const res = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                return new Response(JSON.stringify({
                    stage: 'caspio_query',
                    message: 'Caspio query failed',
                    caspioResponse: data
                }), {
                    status: 502,
                    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
                });
            }

            const batch = Array.isArray(data.Result) ? data.Result : [];
            records.push(...batch);

            // Last page when the batch is smaller than a full page.
            if (batch.length < PAGE_SIZE) break;
            pageNumber++;
            if (pageNumber > 50) break; // hard safety cap (~50k rows)
        }
    } catch (e) {
        return new Response(JSON.stringify({ stage: 'caspio_query', message: e.message }), {
            status: 502,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
    }

    return new Response(JSON.stringify({ ok: true, Result: records }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
}
