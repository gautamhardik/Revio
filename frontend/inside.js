document.addEventListener('DOMContentLoaded', () => {
    // Accordion Logic
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    
    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            const content = header.nextElementSibling;
            const icon = header.querySelector('.accordion-icon');
            const isExpanded = header.getAttribute('aria-expanded') === 'true';
            
            // Toggle current item
            if (isExpanded) {
                header.setAttribute('aria-expanded', 'false');
                content.style.maxHeight = null;
                icon.textContent = '▶';
                item.classList.remove('active');
            } else {
                header.setAttribute('aria-expanded', 'true');
                content.style.maxHeight = content.scrollHeight + "px";
                icon.textContent = '▼';
                item.classList.add('active');
            }
        });
    });

    // Fetch and populate Performance metrics
    const fetchMetrics = async () => {
        try {
            const response = await fetch('/api/v1/metrics');
            if (!response.ok) {
                throw new Error('Failed to fetch metrics');
            }
            const metrics = await response.json();
            
            const tableBody = document.getElementById('metricsTableBody');
            tableBody.innerHTML = ''; // Clear loading state if any
            
            // Define display order and mapping
            const modelMapping = {
                'lr': { name: 'Logistic Regression' },
                'lstm': { name: 'Bi-LSTM' },
                'bert': { name: 'BERT' }
            };
            
            const orderedKeys = ['lr', 'lstm', 'bert'];
            
            orderedKeys.forEach(key => {
                const data = metrics.find(m => m.modelName === modelMapping[key].name || m.modelName.toLowerCase().includes(key));
                if (data) {
                    const row = document.createElement('tr');
                    
                    const formatPct = (val) => val.toFixed(2) + '%';
                    const formatMs = (val) => val + 'ms';
                    
                    row.innerHTML = `
                        <td>${data.modelName}</td>
                        <td>${formatPct(data.accuracy)}</td>
                        <td>${formatPct(data.precision)}</td>
                        <td>${formatPct(data.recall)}</td>
                        <td>${formatPct(data.f1)}</td>
                        <td>${formatMs(data.inferenceMs)}</td>
                    `;
                    tableBody.appendChild(row);
                }
            });
            
            // Adjust accordion height after table is populated
            const activeAccordion = document.querySelector('.accordion-item.active .accordion-content');
            if (activeAccordion) {
                activeAccordion.style.maxHeight = activeAccordion.scrollHeight + "px";
            }
            
        } catch (error) {
            console.error('Error fetching metrics:', error);
            document.getElementById('metricsTableBody').innerHTML = `
                <tr><td colspan="6" style="text-align:center; color: var(--negative-red);">Failed to load performance metrics</td></tr>
            `;
        }
    };

    fetchMetrics();
});
