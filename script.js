
let workItems = [];
let projects = new Set();
let nextDayPlans = [];
let editingIndex = -1;
let currentTheme = 'light';
let draggedItem = null;

// Initialize
document.addEventListener('DOMContentLoaded', function () {
    updateDateDisplay();
    setupEventListeners();
    loadUserPreferences();
    setupAccessibility();
});

function updateDateDisplay() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', options);
}

function setupEventListeners() {
    // Modal elements
    const modalForm = document.getElementById('modalWorkForm');
    const modalStatusSelect = document.getElementById('modalStatus');
    const modalProgressInput = document.getElementById('modalProgress');
    const modalProjectSelect = document.getElementById('modalProjectSelect');
    const modalProjectInput = document.getElementById('modalProjectName');
    const modalToggleBtn = document.getElementById('modalToggleProjectInput');

    // Modal event listeners
    modalForm.addEventListener('submit', handleModalFormSubmit);
    modalStatusSelect.addEventListener('change', handleModalStatusChange);
    modalProgressInput.addEventListener('input', updateModalProgressBar);
    modalProjectSelect.addEventListener('change', handleModalProjectSelect);
    modalToggleBtn.addEventListener('click', toggleModalProjectInput);

    // Close modal when clicking outside
    window.addEventListener('click', function (event) {
        const modal = document.getElementById('taskModal');
        if (event.target === modal) {
            closeTaskModal();
        }
    });
}

// Modal Functions
function openTaskModal(index = -1) {
    editingIndex = index;
    const modal = document.getElementById('taskModal');
    const modalTitle = document.getElementById('modalTitle');
    const submitBtn = document.getElementById('modalSubmitBtn');

    // Update project dropdown first
    updateModalProjectDropdown();

    if (index >= 0) {
        // Edit mode
        modalTitle.textContent = 'Edit Task';
        submitBtn.textContent = 'Update Task';
        populateModalForm(workItems[index]);
    } else {
        // Add mode
        modalTitle.textContent = 'Add New Task';
        submitBtn.textContent = 'Add Work Item';
        clearModalForm();
    }

    modal.style.display = 'block';
}

function closeTaskModal() {
    const modal = document.getElementById('taskModal');
    modal.style.display = 'none';
    editingIndex = -1;
    clearModalForm();
}

function populateModalForm(item) {
    // Set project name in both input and select
    const projectSelect = document.getElementById('modalProjectSelect');
    const projectInput = document.getElementById('modalProjectName');

    if (projects.has(item.projectName)) {
        projectSelect.value = item.projectName;
        projectInput.value = item.projectName;
    } else {
        // If project doesn't exist in dropdown, use input field
        projectSelect.style.display = 'none';
        projectInput.style.display = 'block';
        document.getElementById('modalToggleProjectInput').style.display = 'none';
        projectInput.value = item.projectName;
    }

    document.getElementById('modalWorkDetails').value = item.workDetails;
    document.getElementById('modalStatus').value = item.status;
    document.getElementById('modalPauseReason').value = item.pauseReason || '';
    document.getElementById('modalProgress').value = item.progress;

    // Trigger status change to handle visibility
    handleModalStatusChange({ target: { value: item.status } });
    updateModalProgressBar();
}

function clearModalForm() {
    document.getElementById('modalWorkForm').reset();
    document.getElementById('modalPauseReasonGroup').style.display = 'none';
    document.getElementById('modalProgressGroup').style.display = 'none'; // Hide progress by default
    document.getElementById('modalProgressFill').style.width = '0%';

    // Reset project selection visibility
    const projectSelect = document.getElementById('modalProjectSelect');
    const projectInput = document.getElementById('modalProjectName');
    const toggleBtn = document.getElementById('modalToggleProjectInput');

    if (projects.size > 0) {
        projectSelect.style.display = 'block';
        projectInput.style.display = 'none';
        toggleBtn.style.display = 'inline-block';
        projectSelect.value = '';
    } else {
        projectSelect.style.display = 'none';
        projectInput.style.display = 'block';
        toggleBtn.style.display = 'none';
        projectInput.value = '';
    }
}

function handleModalFormSubmit(e) {
    e.preventDefault();

    // Get project name from either input or select
    let projectName = document.getElementById('modalProjectName').value;
    if (!projectName) {
        projectName = document.getElementById('modalProjectSelect').value;
    }

    // Validate required fields
    if (!projectName) {
        showNotification('Please enter a project name!', 'warning');
        return;
    }

    const workDetails = document.getElementById('modalWorkDetails').value;
    if (!workDetails) {
        showNotification('Please enter work details!', 'warning');
        return;
    }

    const status = document.getElementById('modalStatus').value;
    if (!status) {
        showNotification('Please select a status!', 'warning');
        return;
    }

    const nextDayPlan = document.getElementById('modalNextDayPlan').value;
    const progressValue = parseInt(document.getElementById('modalProgress').value) || 0;

    const formData = {
        projectName: projectName,
        workDetails: workDetails,
        status: status,
        pauseReason: document.getElementById('modalPauseReason').value || '',
        progress: status === 'done' ? 100 : progressValue,
        timestamp: editingIndex >= 0 ? workItems[editingIndex].timestamp : new Date()
    };

    if (editingIndex >= 0) {
        // Update existing item
        workItems[editingIndex] = formData;
        showNotification('Task updated successfully!', 'success');
    } else {
        // Add new item
        workItems.push(formData);
        showNotification('Work item added successfully!', 'success');
    }

    // Add project to the set
    if (projectName) {
        projects.add(projectName);
    }

    // Store next day plan if provided
    if (nextDayPlan && nextDayPlan.trim()) {
        nextDayPlans.push(nextDayPlan.trim());
    }

    // Update the display and close modal
    renderWorkItems();
    closeTaskModal();
}

function handleModalStatusChange(e) {
    const pauseReasonGroup = document.getElementById('modalPauseReasonGroup');
    const progressGroup = document.getElementById('modalProgressGroup');

    if (e.target.value === 'paused') {
        pauseReasonGroup.style.display = 'block';
        document.getElementById('modalPauseReason').required = true;
        progressGroup.style.display = 'none'; // Hide progress for paused
    } else if (e.target.value === 'done') {
        pauseReasonGroup.style.display = 'none';
        document.getElementById('modalPauseReason').required = false;
        document.getElementById('modalPauseReason').value = '';
        progressGroup.style.display = 'none'; // Hide progress for done
        document.getElementById('modalProgress').value = 100;
        updateModalProgressBar();
    } else if (e.target.value === 'inprogress') {
        pauseReasonGroup.style.display = 'none';
        document.getElementById('modalPauseReason').required = false;
        document.getElementById('modalPauseReason').value = '';
        progressGroup.style.display = 'block'; // Show progress only for in progress
    } else {
        // No status selected
        pauseReasonGroup.style.display = 'none';
        progressGroup.style.display = 'none'; // Hide progress by default
    }
}

function updateModalProgressBar() {
    const progress = document.getElementById('modalProgress').value;
    const progressFill = document.getElementById('modalProgressFill');
    progressFill.style.width = progress + '%';
}

function updateModalProjectDropdown() {
    const projectSelect = document.getElementById('modalProjectSelect');
    const projectInput = document.getElementById('modalProjectName');
    const toggleBtn = document.getElementById('modalToggleProjectInput');

    if (projects.size > 0) {
        // Update dropdown options
        projectSelect.innerHTML = '<option value="">Select existing project...</option>' +
            Array.from(projects).map(project =>
                `<option value="${project}">${project}</option>`
            ).join('');

        // Show dropdown, hide input
        projectSelect.style.display = 'block';
        projectInput.style.display = 'none';
        toggleBtn.style.display = 'inline-block';
    } else {
        // No projects yet, show input field
        projectSelect.style.display = 'none';
        projectInput.style.display = 'block';
        toggleBtn.style.display = 'none';
    }
}

function handleModalProjectSelect(e) {
    const selectedProject = e.target.value;
    if (selectedProject) {
        document.getElementById('modalProjectName').value = selectedProject;
    }
}

function toggleModalProjectInput() {
    const projectSelect = document.getElementById('modalProjectSelect');
    const projectInput = document.getElementById('modalProjectName');
    const toggleBtn = document.getElementById('modalToggleProjectInput');

    projectSelect.style.display = 'none';
    projectInput.style.display = 'block';
    projectInput.value = '';
    projectInput.focus();
    toggleBtn.style.display = 'none';
}

function clearAll() {
    workItems = [];
    projects.clear();
    nextDayPlans = [];
    editingIndex = -1;

    renderWorkItems();

    // Clear report preview
    document.getElementById('reportPreview').style.display = 'none';

    showNotification('✅ All data has been reset! Ready for new tasks.', 'success');
}

function renderWorkItems() {
    const container = document.getElementById('workItemsList');

    console.log('Rendering work items:', workItems.length); // Debug log

    if (workItems.length === 0) {
        container.innerHTML = `
                    <div class="empty-state">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012-2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                        </svg>
                        <h3>No work items yet</h3>
                        <p>Add your first work item to get started!</p>
                    </div>
                `;
        return;
    }

    container.innerHTML = workItems.map((item, index) => {
        console.log('Rendering item:', item); // Debug log
        const isEven = index % 2 === 0;
        return `
                    <div class="work-item ${isEven ? 'work-item-even' : 'work-item-odd'}" draggable="true" data-index="${index}" 
                         ondragstart="handleDragStart(event)" 
                         ondragover="handleDragOver(event)" 
                         ondrop="handleDrop(event)"
                         ondragend="handleDragEnd(event)">
                        
                        <div class="work-item-index">${index + 1}</div>
                        
                        <div class="work-item-project-section">
                            <div class="work-item-project">${item.projectName || 'No Project'}</div>
                            <div class="work-item-details">${item.workDetails || 'No details'}</div>
                        </div>
                        
                        ${item.status === 'inprogress' ? `
                        <div class="work-item-progress">
                            <div class="progress-display">
                                <div class="progress-bar-inline">
                                    <div class="progress-fill-inline" style="width: ${item.progress || 0}%"></div>
                                </div>
                                <span class="progress-text-inline">${item.progress || 0}%</span>
                            </div>
                        </div>
                        ` : item.status === 'done' ? `
                        <div class="work-item-progress">
                            <span style="color: var(--success-color); font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; gap: 4px;">
                                <span style="font-size: 1.1rem;">✅</span> Done
                            </span>
                        </div>
                        ` : item.status === 'paused' ? `
                        <div class="work-item-progress">
                            <span style="color: var(--error-color); font-weight: 600; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; gap: 4px;">
                                <span style="font-size: 1.1rem;">⏸️</span> Paused
                            </span>
                        </div>
                        ` : `
                        <div class="work-item-progress">
                            <span style="color: var(--text-secondary); font-size: 0.85rem; text-align: center;">—</span>
                        </div>
                        `}
                        
                        <div class="status-badge status-${item.status}">
                            ${getStatusText(item.status).replace(/[✅🔄⏸️]/g, '').trim()}
                        </div>
                        
                        <div class="task-actions">
                            <button onclick="openTaskModal(${index})" class="action-btn edit-btn">
                                <span class="btn-icon" style="font-size: 1.1rem;">✏️</span>
                            </button>
                            <button onclick="removeWorkItem(${index})" class="action-btn remove-btn">
                                <span class="btn-icon" style="font-size: 1.1rem;">🗑️</span>
                            </button>
                        </div>
                    </div>
                `;
    }).join('');
}

function getStatusText(status) {
    const statusMap = {
        'done': '✅ Done',
        'inprogress': '🔄 In Progress',
        'paused': '⏸️ Paused'
    };
    return statusMap[status] || status;
}

function removeWorkItem(index) {
    workItems.splice(index, 1);
    renderWorkItems();
    showNotification('Work item removed', 'info');
}

function generateReport() {
    if (workItems.length === 0) {
        showNotification('No work items to generate report', 'warning');
        return;
    }

    const today = new Date();
    const dateStr = today.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

    // Create HTML version for display (with bold formatting)
    let displayReport = `**Today's Work Update – ${dateStr}**\n\n`;

    // Create clean version for copying (simple format like your example)
    let copyableReport = `Today's Work Update – ${dateStr}\n`;

    // Group items by project
    const projectGroups = {};
    workItems.forEach(item => {
        if (!projectGroups[item.projectName]) {
            projectGroups[item.projectName] = [];
        }
        projectGroups[item.projectName].push(item);
    });

    // Generate both versions
    Object.keys(projectGroups).forEach(projectName => {
        // Display version (with markdown)
        displayReport += `**${projectName}:**\n`;

        // Copy version (simple clean format)
        copyableReport += `${projectName}\n`;

        projectGroups[projectName].forEach(item => {
            const statusText = getStatusText(item.status).replace(/[✅🔄⏸️]/g, '').trim();

            // Display version
            if (item.status === 'inprogress') {
                displayReport += `• ${item.workDetails} - **${statusText}** (${item.progress}% progress)`;
            } else {
                displayReport += `• ${item.workDetails} - **${statusText}**`;
            }

            // Copy version (simple format like your example)
            if (item.status === 'done') {
                copyableReport += `${item.workDetails} - ${statusText}\n`;
            } else if (item.status === 'inprogress') {
                copyableReport += `${item.workDetails} - in progress\n`;
            } else if (item.status === 'paused') {
                copyableReport += `${item.workDetails} - paused`;
                if (item.pauseReason) {
                    copyableReport += ` (${item.pauseReason})`;
                }
                copyableReport += '\n';
            }

            if (item.pauseReason) {
                displayReport += ` - Reason: ${item.pauseReason}`;
            }
            displayReport += '\n';
        });
        displayReport += '\n';
        copyableReport += '\n';
    });

    // Add next day plan
    displayReport += "**Next Day Plan:**\n";
    copyableReport += ":clipboard: Next Day Plan:\n";

    if (nextDayPlans.length > 0) {
        nextDayPlans.forEach(plan => {
            displayReport += `• ${plan}\n`;
            copyableReport += `• ${plan}\n`;
        });
    } else {
        const defaultPlans = [
            "Continue with in-progress tasks",
            "Resolve paused items",
            "[Add specific plans here]"
        ];
        defaultPlans.forEach(plan => {
            displayReport += `• ${plan}\n`;
            copyableReport += `• ${plan}\n`;
        });
    }

    // Add static leaving for the day message
    displayReport += "\n**Leaving for the day - Thank you!**\n";
    copyableReport += "\nLeaving for the day - Thank you!\n";

    document.getElementById('reportPreview').style.display = 'block';
    // Store the clean copyable version
    document.getElementById('reportPreview').dataset.originalText = copyableReport;
    // Convert markdown to HTML for display
    const htmlReport = displayReport.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    document.getElementById('reportPreview').innerHTML = htmlReport;

    showNotification('Report generated successfully!', 'success');
}

function copyReport() {
    const reportElement = document.getElementById('reportPreview');
    if (!reportElement.innerHTML) {
        showNotification('Generate report first!', 'warning');
        return;
    }

    // Get the clean copyable version (formatted for Slack/messaging)
    const copyableText = reportElement.dataset.originalText;

    if (!copyableText) {
        showNotification('Please generate the report first!', 'warning');
        return;
    }

    navigator.clipboard.writeText(copyableText).then(() => {
        showNotification('✅ Report copied! Ready to paste in Slack/Teams/Email', 'success');
    }).catch(() => {
        showNotification('Failed to copy report', 'error');
    });
}

function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 25px;
                border-radius: 8px;
                color: white;
                font-weight: 600;
                z-index: 1000;
                animation: slideInRight 0.3s ease;
            `;

    // Set color based on type
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };

    notification.style.background = colors[type] || colors.info;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Add CSS animation for notifications
const style = document.createElement('style');
style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
document.head.appendChild(style);

// Theme Management
function toggleThemeSelector() {
    const selector = document.getElementById('themeSelector');
    selector.style.display = selector.style.display === 'none' ? 'block' : 'none';
}

function setTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateThemeSelector();
    document.getElementById('themeSelector').style.display = 'none';
    showNotification(`Theme changed to ${theme}!`, 'success');
}

function updateThemeSelector() {
    document.querySelectorAll('.theme-option').forEach(option => {
        option.classList.remove('active');
        if (option.dataset.theme === currentTheme) {
            option.classList.add('active');
        }
    });
}

function loadUserPreferences() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
}

// Accessibility Improvements
function setupAccessibility() {
    // Add ARIA labels
    document.getElementById('themeBtn').setAttribute('aria-label', 'Change theme');
    document.getElementById('taskModal').setAttribute('aria-modal', 'true');

    // Add focus management
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Tab') {
            const modal = document.getElementById('taskModal');
            if (modal.style.display === 'block') {
                trapFocus(modal, e);
            }
        }
    });
}

function trapFocus(element, event) {
    const focusableElements = element.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
        lastElement.focus();
        event.preventDefault();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
        firstElement.focus();
        event.preventDefault();
    }
}

// Drag and Drop Functions
function handleDragStart(e) {
    draggedItem = parseInt(e.target.dataset.index);
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const targetElement = e.target.closest('.work-item');
    if (targetElement && !targetElement.classList.contains('dragging')) {
        targetElement.classList.add('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();

    const targetElement = e.target.closest('.work-item');
    if (targetElement) {
        const targetIndex = parseInt(targetElement.dataset.index);

        if (draggedItem !== null && draggedItem !== targetIndex) {
            // Reorder the items
            const draggedItemData = workItems[draggedItem];
            workItems.splice(draggedItem, 1);
            workItems.splice(targetIndex, 0, draggedItemData);

            renderWorkItems();
            showNotification('Task reordered successfully!', 'success');
        }
    }

    // Clean up
    document.querySelectorAll('.work-item').forEach(item => {
        item.classList.remove('drag-over');
    });
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.work-item').forEach(item => {
        item.classList.remove('drag-over');
    });
    draggedItem = null;
}
