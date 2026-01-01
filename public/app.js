// Monitoring Telebot - Frontend Logic
(function () {
    let token = null;
    let localStorageAvailable = false;
    let deleteConfirmationState = {};
    let currentServices = [];
    let refreshInterval = null;

    // 1. Initial Auth Check
    try {
        token = localStorage.getItem('token');
        localStorageAvailable = true;
    } catch (e) {
        console.warn('localStorage is not available.', e);
    }

    // 2. DOM Elements
    const loginPage = document.getElementById('login-page');
    const dashboard = document.getElementById('dashboard');
    const loginForm = document.getElementById('login-form');
    const serviceForm = document.getElementById('service-form');
    const servicesGrid = document.getElementById('services-grid');
    const loginError = document.getElementById('login-error');
    const serviceModal = document.getElementById('service-modal');
    const modalTitle = document.getElementById('modal-title');
    const serviceIdField = document.getElementById('service-id');

    // 3. UI Helpers
    function showPage(pageId) {
        if (pageId === 'dashboard') {
            loginPage.classList.add('hidden');
            dashboard.classList.remove('hidden');
            startPolling();
        } else {
            loginPage.classList.remove('hidden');
            dashboard.classList.add('hidden');
            stopPolling();
        }
    }

    function openModal(isEdit = false, service = null) {
        serviceModal.classList.remove('hidden');
        if (isEdit && service) {
            modalTitle.textContent = 'Edit Service';
            serviceIdField.value = service.id;
            document.getElementById('s-name').value = service.name;
            document.getElementById('s-target').value = service.target;
            document.getElementById('s-interval').value = service.interval;
            document.getElementById('s-timeout').value = service.timeout;
            document.getElementById('s-enabled').checked = service.enabled;
        } else {
            modalTitle.textContent = 'Add New Service';
            serviceForm.reset();
            serviceIdField.value = '';
        }
    }

    function closeModal() {
        serviceModal.classList.add('hidden');
    }

    // 4. Core Logic
    async function fetchServices() {
        if (!token) return;
        try {
            const res = await fetch('/services', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401) return showPage('login');

            const services = await res.json();
            currentServices = services;
            renderServices(services);
        } catch (err) {
            console.error('Fetch failed:', err);
        }
    }

    function renderServices(services) {
        if (!servicesGrid) return;
        servicesGrid.innerHTML = services.map(s => {
            const isConfirming = deleteConfirmationState[s.id];
            const isChecking = deleteConfirmationState[`checking_${s.id}`];
            return `
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="font-bold text-gray-800">${s.name}</h3>
                        <p class="text-xs text-gray-500 uppercase tracking-wider">DUAL CHECK (HTTP+TCP)</p>
                    </div>
                    <span class="px-2.5 py-1 rounded-full text-xs font-bold ${s.lastStatus === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                        ${s.lastStatus.toUpperCase()}
                    </span>
                </div>
                <p class="text-sm text-gray-600 mb-2 truncate">${s.target}</p>
                <div class="flex gap-3 text-xs mb-4">
                    <span class="${s.lastHttpStatus === 'up' ? 'text-green-600' : 'text-red-600'}">
                        HTTP: ${s.lastHttpStatus || 'unknown'}
                        ${s.lastHttpStatus === 'down' ? `(${s.httpFailureCount}/2)` : ''}
                    </span>
                    <span class="${s.lastTcpStatus === 'up' ? 'text-green-600' : 'text-red-600'}">
                        TCP: ${s.lastTcpStatus || 'unknown'}
                        ${s.lastTcpStatus === 'down' ? `(${s.tcpFailureCount}/2)` : ''}
                    </span>
                </div>
                <div class="flex justify-between items-center pt-4 border-t border-gray-50">
                    <div class="flex gap-2">
                        <button data-action="check" data-id="${s.id}" 
                            class="text-blue-600 hover:text-blue-700 text-sm font-medium px-2 py-1 ${isChecking ? 'opacity-50 cursor-not-allowed' : ''}" 
                            ${isChecking ? 'disabled' : ''}>
                            ${isChecking ? 'Checking...' : 'Check Now'}
                        </button>
                        <button data-action="edit" data-service='${encodeURIComponent(JSON.stringify(s))}' 
                            class="text-purple-600 hover:text-purple-700 text-sm font-medium px-2 py-1">Edit</button>
                        <button data-action="delete" data-id="${s.id}" 
                            class="${isConfirming ? 'text-white bg-red-500 rounded px-2 hover:bg-red-600' : 'text-red-500 hover:text-red-600'} text-sm font-medium px-2 py-1 transition-colors duration-200">
                            ${isConfirming ? 'Confirm?' : 'Delete'}
                        </button>
                    </div>
                    <div class="text-xs text-gray-400">
                        Checked: ${s.lastCheckedAt ? new Date(s.lastCheckedAt).toLocaleTimeString() : 'Never'}
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    async function deleteService(id) {
        if (!deleteConfirmationState[id]) {
            deleteConfirmationState[id] = true;
            renderServices(currentServices); // Re-render from memory

            setTimeout(() => {
                if (deleteConfirmationState[id]) {
                    delete deleteConfirmationState[id];
                    renderServices(currentServices);
                }
            }, 3000);
            return;
        }

        try {
            const res = await fetch(`/services/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Delete failed');

            delete deleteConfirmationState[id];
            await fetchServices();
        } catch (err) {
            console.error(err);
            alert('Error deleting service');
            delete deleteConfirmationState[id];
            renderServices(currentServices);
        }
    }

    async function testBot() {
        try {
            const res = await fetch('/services/test-alert', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) alert('Test message sent!');
            else alert('Failed to send test message');
        } catch (err) {
            alert('Error triggering test');
        }
    }

    async function checkServiceNow(id) {
        // Set checking state
        deleteConfirmationState[`checking_${id}`] = true;
        renderServices(currentServices);

        try {
            const res = await fetch(`/services/${id}/check`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                console.log('Manual check completed:', data);
                // Refresh services to show updated status
                await fetchServices();
            } else {
                alert('Failed to check service');
            }
        } catch (err) {
            console.error('Error checking service:', err);
            alert('Error checking service');
        } finally {
            // Clear checking state
            delete deleteConfirmationState[`checking_${id}`];
            renderServices(currentServices);
        }
    }

    function startPolling() {
        fetchServices();
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = setInterval(fetchServices, 3000);
    }

    function stopPolling() {
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = null;
    }

    // 5. Event Binding
    document.addEventListener('DOMContentLoaded', () => {
        // Global clicks (Event Delegation)
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            // Direct ID matches
            if (btn.id === 'test-bot-btn') return testBot();
            if (btn.id === 'add-service-btn') return openModal();
            if (btn.id === 'close-modal-x' || btn.id === 'close-modal-btn') return closeModal();
            if (btn.id === 'modal-overlay') return closeModal();
            if (btn.id === 'logout-btn') {
                if (localStorageAvailable) localStorage.removeItem('token');
                token = null;
                showPage('login');
                return;
            }

            // Data attributes (Services Grid)
            const action = btn.getAttribute('data-action');
            if (action === 'delete') {
                deleteService(btn.getAttribute('data-id'));
            } else if (action === 'edit') {
                const service = JSON.parse(decodeURIComponent(btn.getAttribute('data-service')));
                openModal(true, service);
            } else if (action === 'check') {
                checkServiceNow(btn.getAttribute('data-id'));
            }
        });

        // Form Submissions
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                try {
                    const res = await fetch('/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });
                    const data = await res.json();
                    if (data.token) {
                        token = data.token;
                        if (localStorageAvailable) localStorage.setItem('token', token);
                        showPage('dashboard');
                    } else {
                        loginError.textContent = data.error || 'Login failed';
                        loginError.classList.remove('hidden');
                    }
                } catch (err) {
                    loginError.textContent = 'Server error';
                    loginError.classList.remove('hidden');
                }
            });
        }

        if (serviceForm) {
            serviceForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const id = serviceIdField.value;
                const body = {
                    name: document.getElementById('s-name').value,
                    target: document.getElementById('s-target').value,
                    interval: parseInt(document.getElementById('s-interval').value),
                    timeout: parseInt(document.getElementById('s-timeout').value),
                    enabled: document.getElementById('s-enabled').checked
                };
                const method = id ? 'PUT' : 'POST';
                const url = id ? `/services/${id}` : '/services';

                try {
                    const res = await fetch(url, {
                        method,
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify(body)
                    });
                    if (res.ok) {
                        closeModal();
                        fetchServices();
                    } else {
                        const data = await res.json();
                        alert('Error: ' + (data.error || 'Failed to save'));
                    }
                } catch (err) {
                    console.error(err);
                }
            });
        }

        // Final Init
        if (token) {
            showPage('dashboard');
        } else {
            showPage('login');
        }
    });

})();
