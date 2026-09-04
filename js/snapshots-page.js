(function () {
    'use strict';
    document.getElementById('sidebar-container').innerHTML = generateSidebar('Backups & Snapshots');
    document.getElementById('header-container').innerHTML = generateHeader('Backups & Snapshots');
    const refresh = document.getElementById('snapshot-refresh');
    const status = document.getElementById('snapshot-files-status');
    const container = document.getElementById('snapshot-files-datapage');
    // The shell is not an authorization boundary. The report must require Caspio authentication.
    refresh.addEventListener('click', function () { window.location.reload(); });
    refresh.disabled = true;
    const embed = CASPIO_DATAPAGES.snapshotFiles;
    if (!embed) {
        status.textContent = 'Backup files are not connected yet. An administrator needs to finish the Caspio report setup.';
        return;
    }
    let url;
    try {
        url = new URL(embed);
        if (url.origin !== 'https://c2ect483.caspio.com' || !/^\/dp\/[a-f0-9]{20,}\/emb$/i.test(url.pathname) || url.search || url.hash) throw new Error('Invalid embed');
    } catch (_) {
        status.textContent = 'The report configuration needs attention. Contact the WMS administrator.';
        return;
    }
    refresh.disabled = false;
    status.textContent = 'Loading backup files. Sign in to Caspio if prompted.';
    const timeout = window.setTimeout(function () {
        if (!status.hidden) status.textContent = 'The report is taking longer than expected. Complete any sign-in prompt, or refresh to try again.';
    }, 20000);
    let observer;
    function observeReport() {
        // Recognize native results or login, without requiring a custom header snippet.
        // An event from another DataPage cannot hide this mount's loading state.
        if (container.querySelector('.wms-snapshot-report-marker, .cbResultSetTable, .cbResultSetData, .cbResultSetListView, .cbResultSetNoRecords, .cbFormTable, .os-auth-header, input[type="password"]')) {
            status.hidden = true;
            window.clearTimeout(timeout);
            if (observer) observer.disconnect();
        }
    }
    document.addEventListener('DataPageReady', observeReport);
    if (typeof MutationObserver !== 'undefined') {
        observer = new MutationObserver(observeReport);
        observer.observe(container, { childList: true, subtree: true });
    }
    const script = document.createElement('script');
    script.src = url.href;
    script.onerror = function () {
        window.clearTimeout(timeout);
        if (observer) observer.disconnect();
        status.hidden = false;
        status.textContent = 'Backup files could not load. Check your connection and refresh to try again.';
    };
    script.onload = observeReport;
    container.appendChild(script);
}());
