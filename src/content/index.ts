// Vue.js Grid Data Insertion Logic - Multiple rows support
function insertDataToVueGrid(targetSelector?: string, customData?: any[]) {
    console.log('🚀 Starting Vue.js Grid Data Insertion...');

    // Default data to insert (sample data for 2 rows)
    const defaultDataToInsert = [
        {
            accounting_object_code: null,
            accounting_object_id: null,
            accounting_object_name: null,
            activity_id: 'd01d000f-83df-4f9d-bb4d-ba0babaa5a0c',
            activity_name: 'Hoạt động từ nguồn NSNN cấp',
            budget_chapter_code: '622',
            budget_chapter_id: '3cf8f3ad-6e72-400b-9cf6-24650a3dc8da',
            budget_kind_item_code: '340',
            budget_kind_item_id: '624baeae-92e0-41e0-aa3b-85b51dbacccc',
            budget_source_group_property_type: 1,
            budget_source_id: '4c26e114-1fec-4a53-9eaa-dce78de34b2a',
            budget_source_name: 'Ngân sách Huyện tự chủ',
            budget_sub_kind_item_code: '341',
            budget_sub_kind_item_id: 'ff8833d8-84e9-416d-81e9-f1bbc080ce4d',
            cash_withdraw_type_id: 7,
            cash_withdraw_type_name: 'Nhận dự toán',
            // Tài khoản nợ
            debit_account: '6422',

            // "credit_account" tài khoản có
            credit_account: '1121',
            // Diễn dãi description
            //2.220.450 Số tiền "amount_oc"
            amount_oc: 2220450,

            description: 'Chuyển tiền xăng đi công tác ',
            method_distribute_name: 'Dự toán',
            method_distribute_type: 0,
            project_code: null,
            project_id: null,
            ref_detail_id: 'a67aaf75-61f7-4d25-8f22-4eefa2272172',
            selected: true,
            sort_order: null,
            state: 4,

            // Số chứng từ gốc
            org_ref_no: ''
            //94000094-001121 tài khoản nhận
        }
    ];

    // Use custom data if provided, otherwise use default
    const dataToInsert = customData || defaultDataToInsert;

    // Use user-specified selector or default
    const selector = targetSelector || 'tr.ms-tr.custom-class';
    console.log('🎯 Target selector:', selector);
    console.log('📊 Data rows to insert:', dataToInsert.length);

    // Try insertion with specified selector
    tryMultipleDataInsertionWithSelector(dataToInsert, selector);
}

// Multiple data insertion function with user-specified selector
async function tryMultipleDataInsertionWithSelector(dataArray: any[], selector: string) {
    console.log('🚀 Starting multiple data insertion with selector:', selector);
    console.log('📊 Number of rows to insert:', dataArray.length);

    try {
        let successCount = 0;
        let failCount = 0;

        // Insert each data row sequentially
        for (let i = 0; i < dataArray.length; i++) {
            const data = dataArray[i];
            console.log(`🔄 Inserting row ${i + 1}/${dataArray.length}...`);

            try {
                // Try web accessible resource injection with custom selector
                const success = await tryWebAccessibleResourceInjection(data, selector, i);
                if (success) {
                    successCount++;
                    console.log(`✅ Row ${i + 1} insertion succeeded`);

                    // Wait a bit between insertions to allow UI to update
                    if (i < dataArray.length - 1) {
                        await sleep(1000);
                    }
                } else {
                    failCount++;
                    console.log(`❌ Row ${i + 1} insertion failed`);
                }
            } catch (error) {
                failCount++;
                console.error(`❌ Error inserting row ${i + 1}:`, error);
            }
        }

        // Show final result
        if (successCount === dataArray.length) {
            showSimpleNotification(
                `✅ Thành công! Đã chèn ${successCount} dòng dữ liệu vào lưới!`,
                'success'
            );
        } else if (successCount > 0) {
            showSimpleNotification(
                `⚠️ Chèn thành công ${successCount}/${dataArray.length} dòng. ${failCount} dòng thất bại.`,
                'info'
            );
        } else {
            showSimpleNotification(
                '❌ Không thể chèn dữ liệu. Vui lòng kiểm tra selector: ' + selector,
                'error'
            );
        }
    } catch (error) {
        console.error('❌ Error in multiple data insertion:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        showSimpleNotification('❌ Lỗi: ' + errorMessage, 'error');
    }
}

// Main data insertion function with user-specified selector (single row - kept for backward compatibility)
async function tryDataInsertionWithSelector(data: any, selector: string) {
    console.log('🚀 Starting data insertion with selector:', selector);

    try {
        // Try web accessible resource injection with custom selector
        const success = await tryWebAccessibleResourceInjection(data, selector);
        if (success) {
            console.log('✅ Data insertion succeeded');
            showSimpleNotification('✅ Thành công! Đã chèn dữ liệu vào lưới!', 'success');
            return;
        }

        // If failed, show error
        console.log('❌ Data insertion failed');
        showSimpleNotification(
            '❌ Không thể chèn dữ liệu. Vui lòng kiểm tra selector: ' + selector,
            'error'
        );
    } catch (error) {
        console.error('❌ Error in data insertion:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        showSimpleNotification('❌ Lỗi: ' + errorMessage, 'error');
    }
}

// Strategy 1: Direct DOM manipulation with event simulation
async function tryDirectDOMManipulation(data: any): Promise<boolean> {
    console.log('🔧 Trying direct DOM manipulation...');

    try {
        // Find the target grid table
        const gridTable = document.querySelector('table.ms-table');
        if (!gridTable) {
            console.log('❌ Grid table not found');
            return false;
        }

        // Find the add button or create new row mechanism
        const addButton = gridTable.querySelector(
            'button[title*="Thêm"], button[title*="Add"], .ms-button-add, .add-row-btn'
        );
        if (addButton) {
            console.log('✅ Found add button, clicking...');
            simulateClick(addButton as HTMLElement);

            // Wait for new row to be created
            await sleep(500);
        }

        // Find the target row (usually the last row or a row with specific class)
        const targetRow = findTargetRow(gridTable);
        if (!targetRow) {
            console.log('❌ Target row not found');
            return false;
        }

        console.log('✅ Found target row:', targetRow);

        // Fill data into the row
        const success = await fillRowWithData(targetRow, data);
        return success;
    } catch (error) {
        console.error('❌ Direct DOM manipulation failed:', error);
        return false;
    }
}

// Enhanced web accessible resource injection with custom selector
async function tryWebAccessibleResourceInjection(
    data: any,
    selector: string = 'tr.ms-tr.custom-class',
    rowIndex?: number
): Promise<boolean> {
    const logPrefix = rowIndex !== undefined ? `[Row ${rowIndex + 1}]` : '';
    console.log(
        `🚀 ${logPrefix} Trying enhanced web accessible resource injection with selector:`,
        selector
    );

    return new Promise(resolve => {
        // Get extension URL for the injected script
        const scriptUrl = chrome.runtime.getURL('src/injected/vue-injector.js');
        console.log(`📄 ${logPrefix} Script URL:`, scriptUrl);

        // Check if script is already injected
        const existingScript = document.getElementById('vue-grid-injector');
        if (existingScript) {
            console.log(`✅ ${logPrefix} Script already injected, sending message...`);
            sendVueInsertMessage(data, selector, rowIndex);

            // Set up timeout for response
            const timeout = setTimeout(() => {
                console.log(`⏰ ${logPrefix} Web accessible resource timeout`);
                resolve(false);
            }, 5000);

            // Listen for success/failure
            const messageHandler = (event: MessageEvent) => {
                if (event.source !== window) return;

                if (event.data.type === 'VUE_GRID_INSERT_SUCCESS') {
                    clearTimeout(timeout);
                    window.removeEventListener('message', messageHandler);
                    resolve(true);
                } else if (event.data.type === 'VUE_GRID_INSERT_ERROR') {
                    clearTimeout(timeout);
                    window.removeEventListener('message', messageHandler);
                    resolve(false);
                }
            };

            window.addEventListener('message', messageHandler);
            return;
        }

        // Create script element with web accessible resource
        const script = document.createElement('script');
        script.id = 'vue-grid-injector';
        script.src = scriptUrl;

        const timeout = setTimeout(() => {
            console.log(`⏰ ${logPrefix} Web accessible resource timeout`);
            resolve(false);
        }, 10000);

        script.onload = () => {
            console.log(`✅ ${logPrefix} Web accessible resource script loaded successfully`);
            // Wait a bit for script to initialize, then send message
            setTimeout(() => {
                sendVueInsertMessage(data, selector, rowIndex);

                // Listen for success/failure
                const messageHandler = (event: MessageEvent) => {
                    if (event.source !== window) return;

                    if (event.data.type === 'VUE_GRID_INSERT_SUCCESS') {
                        clearTimeout(timeout);
                        window.removeEventListener('message', messageHandler);
                        resolve(true);
                    } else if (event.data.type === 'VUE_GRID_INSERT_ERROR') {
                        clearTimeout(timeout);
                        window.removeEventListener('message', messageHandler);
                        resolve(false);
                    }
                };

                window.addEventListener('message', messageHandler);
            }, 100);
        };

        script.onerror = () => {
            console.error(`❌ ${logPrefix} Failed to load web accessible resource script`);
            clearTimeout(timeout);
            resolve(false);
        };

        // Inject script into page
        (document.head || document.documentElement).appendChild(script);
        console.log(`✅ ${logPrefix} Web accessible resource script injection initiated`);
    });
}

// Helper functions for DOM manipulation
function simulateClick(element: HTMLElement) {
    console.log('🖱️ Simulating click on element:', element);

    // Create and dispatch multiple events to ensure compatibility
    const events = ['mousedown', 'mouseup', 'click'];

    events.forEach(eventType => {
        const event = new MouseEvent(eventType, {
            bubbles: true,
            cancelable: true,
            view: window
        });
        element.dispatchEvent(event);
    });

    // Also try direct click if available
    if (typeof element.click === 'function') {
        element.click();
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function findTargetRow(gridTable: Element): HTMLElement | null {
    console.log('🔍 Finding target row in grid table...');

    // Strategy 1: Look for specific custom-class first (for backward compatibility)
    const targetRow = gridTable.querySelector('tr.ms-tr.custom-class') as HTMLElement;
    if (targetRow) {
        console.log('✅ Found target row with custom-class');
        return targetRow;
    }

    // Strategy 2: Look for editable rows
    const editableSelectors = [
        'tr.ms-tr.row-editor',
        'tr.ms-tr[class*="editor"]',
        'tr.ms-tr[class*="edit"]',
        'tr.ms-tr:last-child',
        'tr.ms-tr[data-new="true"]',
        'tr.ms-tr.new-row',
        'tbody tr:last-child'
    ];

    for (const selector of editableSelectors) {
        const row = gridTable.querySelector(selector) as HTMLElement;
        if (row) {
            console.log(`✅ Found target row with selector: ${selector}`);
            return row;
        }
    }

    // Strategy 3: Look for any tr.ms-tr that might be suitable
    const allRows = gridTable.querySelectorAll('tr.ms-tr');
    console.log(`🔍 Found ${allRows.length} tr.ms-tr elements, checking for suitable row...`);

    for (let i = allRows.length - 1; i >= 0; i--) {
        const row = allRows[i] as HTMLElement;

        // Check if row has input elements (likely editable)
        const inputs = row.querySelectorAll('input, textarea, select');
        if (inputs.length > 0) {
            console.log(`✅ Found row with ${inputs.length} input elements at index ${i}`);
            return row;
        }
    }

    // Fallback: use last row if available
    if (allRows.length > 0) {
        const lastRow = allRows[allRows.length - 1] as HTMLElement;
        console.log('✅ Using last row as fallback target');
        return lastRow;
    }

    console.log('❌ No target row found');
    return null;
}

async function fillRowWithData(row: HTMLElement, data: any): Promise<boolean> {
    console.log('📝 Filling row with data:', data);

    try {
        // Find all input elements in the row
        const inputs = row.querySelectorAll('input, textarea, select');
        console.log(`🔍 Found ${inputs.length} input elements in row`);

        // Map data fields to inputs based on common patterns
        const fieldMappings = [
            {
                field: 'debit_account',
                selectors: [
                    'input[name*="debit"]',
                    'input[placeholder*="tài khoản"]',
                    'input[data-field="debit_account"]'
                ]
            },
            {
                field: 'budget_chapter_code',
                selectors: [
                    'input[name*="chapter"]',
                    'input[placeholder*="chương"]',
                    'input[data-field="budget_chapter_code"]'
                ]
            },
            {
                field: 'budget_kind_item_code',
                selectors: [
                    'input[name*="kind"]',
                    'input[placeholder*="loại"]',
                    'input[data-field="budget_kind_item_code"]'
                ]
            },
            {
                field: 'budget_source_name',
                selectors: [
                    'input[name*="source"]',
                    'input[placeholder*="nguồn"]',
                    'input[data-field="budget_source_name"]'
                ]
            },
            {
                field: 'description',
                selectors: [
                    'input[name*="description"]',
                    'textarea',
                    'input[placeholder*="diễn giải"]',
                    'input[data-field="description"]'
                ]
            }
        ];

        let filledCount = 0;

        // Try to fill fields based on mappings
        for (const mapping of fieldMappings) {
            const value = data[mapping.field];
            if (value === null || value === undefined) continue;

            let targetInput: HTMLInputElement | null = null;

            // Try each selector for this field
            for (const selector of mapping.selectors) {
                targetInput = row.querySelector(selector) as HTMLInputElement;
                if (targetInput) break;
            }

            // If no specific selector worked, try by index
            if (!targetInput && inputs.length > filledCount) {
                targetInput = inputs[filledCount] as HTMLInputElement;
            }

            if (targetInput) {
                await fillInputWithValue(targetInput, String(value));
                filledCount++;
                console.log(`✅ Filled ${mapping.field} = ${value}`);
            }
        }

        console.log(`✅ Successfully filled ${filledCount} fields`);
        return filledCount > 0;
    } catch (error) {
        console.error('❌ Error filling row with data:', error);
        return false;
    }
}

async function fillInputWithValue(input: HTMLInputElement, value: string): Promise<void> {
    console.log(`📝 Filling input with value: ${value}`);

    // Focus the input
    input.focus();
    await sleep(50);

    // Clear existing value
    input.select();
    await sleep(50);

    // Set the value using multiple methods for compatibility
    input.value = value;

    // Dispatch input events to trigger Vue.js reactivity
    const events = [
        new Event('input', { bubbles: true }),
        new Event('change', { bubbles: true }),
        new Event('blur', { bubbles: true })
    ];

    for (const event of events) {
        input.dispatchEvent(event);
        await sleep(10);
    }

    // Also try Vue.js specific event triggering
    if ((input as any).__vue__) {
        try {
            const vueInstance = (input as any).__vue__;
            if (vueInstance && vueInstance.$emit) {
                vueInstance.$emit('input', value);
                vueInstance.$emit('change', value);
            }
        } catch (error) {
            console.log('Vue.js event triggering failed (expected in content script)');
        }
    }
}

// Strategy 3: Advanced script injection with multiple methods
async function tryAdvancedScriptInjection(data: any): Promise<boolean> {
    console.log('🔧 Trying advanced script injection...');

    return new Promise(resolve => {
        const timeout = setTimeout(() => {
            console.log('⏰ Advanced script injection timeout');
            resolve(false);
        }, 10000);

        // Method 1: Try blob URL injection
        tryBlobURLInjection(data)
            .then(success => {
                if (success) {
                    clearTimeout(timeout);
                    resolve(true);
                    return;
                }

                // Method 2: Try data URL injection
                return tryDataURLInjection(data);
            })
            .then(success => {
                if (success) {
                    clearTimeout(timeout);
                    resolve(true);
                    return;
                }

                // Method 3: Try eval injection
                return tryEvalInjection(data);
            })
            .then(success => {
                clearTimeout(timeout);
                resolve(success || false);
            })
            .catch(error => {
                console.error('❌ Advanced script injection failed:', error);
                clearTimeout(timeout);
                resolve(false);
            });
    });
}

async function tryBlobURLInjection(data: any): Promise<boolean> {
    console.log('🔄 Trying blob URL injection...');

    try {
        const scriptContent = generateVueInsertionScript(data);
        const blob = new Blob([scriptContent], { type: 'application/javascript' });
        const scriptUrl = URL.createObjectURL(blob);

        const script = document.createElement('script');
        script.src = scriptUrl;

        return new Promise(resolve => {
            const timeout = setTimeout(() => {
                URL.revokeObjectURL(scriptUrl);
                resolve(false);
            }, 5000);

            const messageHandler = (event: MessageEvent) => {
                if (event.source !== window) return;

                if (event.data.type === 'VUE_GRID_INSERT_SUCCESS') {
                    clearTimeout(timeout);
                    window.removeEventListener('message', messageHandler);
                    URL.revokeObjectURL(scriptUrl);
                    resolve(true);
                } else if (event.data.type === 'VUE_GRID_INSERT_ERROR') {
                    clearTimeout(timeout);
                    window.removeEventListener('message', messageHandler);
                    URL.revokeObjectURL(scriptUrl);
                    resolve(false);
                }
            };

            window.addEventListener('message', messageHandler);

            script.onload = () => {
                console.log('✅ Blob URL script loaded');
            };

            script.onerror = () => {
                console.error('❌ Blob URL script failed');
                clearTimeout(timeout);
                window.removeEventListener('message', messageHandler);
                URL.revokeObjectURL(scriptUrl);
                resolve(false);
            };

            (document.head || document.documentElement).appendChild(script);

            // Clean up script after execution
            setTimeout(() => {
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
            }, 1000);
        });
    } catch (error) {
        console.error('❌ Blob URL injection failed:', error);
        return false;
    }
}

async function tryDataURLInjection(data: any): Promise<boolean> {
    console.log('🔄 Trying data URL injection...');

    try {
        const scriptContent = generateVueInsertionScript(data);
        const dataUrl = `data:application/javascript;base64,${btoa(scriptContent)}`;

        const script = document.createElement('script');
        script.src = dataUrl;

        return new Promise(resolve => {
            const timeout = setTimeout(() => {
                resolve(false);
            }, 5000);

            const messageHandler = (event: MessageEvent) => {
                if (event.source !== window) return;

                if (event.data.type === 'VUE_GRID_INSERT_SUCCESS') {
                    clearTimeout(timeout);
                    window.removeEventListener('message', messageHandler);
                    resolve(true);
                } else if (event.data.type === 'VUE_GRID_INSERT_ERROR') {
                    clearTimeout(timeout);
                    window.removeEventListener('message', messageHandler);
                    resolve(false);
                }
            };

            window.addEventListener('message', messageHandler);

            script.onload = () => {
                console.log('✅ Data URL script loaded');
            };

            script.onerror = () => {
                console.error('❌ Data URL script failed');
                clearTimeout(timeout);
                window.removeEventListener('message', messageHandler);
                resolve(false);
            };

            (document.head || document.documentElement).appendChild(script);

            // Clean up script after execution
            setTimeout(() => {
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
            }, 1000);
        });
    } catch (error) {
        console.error('❌ Data URL injection failed:', error);
        return false;
    }
}

async function tryEvalInjection(data: any): Promise<boolean> {
    console.log('🔄 Trying eval injection...');

    try {
        const scriptContent = generateVueInsertionScript(data);

        return new Promise(resolve => {
            const timeout = setTimeout(() => {
                resolve(false);
            }, 5000);

            const messageHandler = (event: MessageEvent) => {
                if (event.source !== window) return;

                if (event.data.type === 'VUE_GRID_INSERT_SUCCESS') {
                    clearTimeout(timeout);
                    window.removeEventListener('message', messageHandler);
                    resolve(true);
                } else if (event.data.type === 'VUE_GRID_INSERT_ERROR') {
                    clearTimeout(timeout);
                    window.removeEventListener('message', messageHandler);
                    resolve(false);
                }
            };

            window.addEventListener('message', messageHandler);

            // Try to execute script in page context using eval
            try {
                const script = document.createElement('script');
                script.textContent = scriptContent;
                (document.head || document.documentElement).appendChild(script);

                // Clean up script after execution
                setTimeout(() => {
                    if (script.parentNode) {
                        script.parentNode.removeChild(script);
                    }
                }, 1000);

                console.log('✅ Eval injection executed');
            } catch (evalError) {
                console.error('❌ Eval injection failed:', evalError);
                clearTimeout(timeout);
                window.removeEventListener('message', messageHandler);
                resolve(false);
            }
        });
    } catch (error) {
        console.error('❌ Eval injection failed:', error);
        return false;
    }
}

function generateVueInsertionScript(data: any): string {
    return `
        (function() {
            console.log('📝 Generated Vue insertion script executing...');

            function executeVueInsertion(retryCount = 0) {
                try {
                    console.log('🔄 Attempt ' + (retryCount + 1) + ' to insert data...');

                    // Try to find the target element using multiple strategies
                    var targetElement = null;

                    // Strategy 1: Look for specific custom-class first
                    targetElement = document.querySelector('tr.ms-tr.custom-class');
                    if (targetElement) {
                        console.log('✅ Found target element with custom-class');
                    }

                    // Strategy 2: Look for editable rows
                    if (!targetElement) {
                        var editableSelectors = [
                            'tr.ms-tr.row-editor',
                            'tr.ms-tr[class*="editor"]',
                            'tr.ms-tr[class*="edit"]',
                            'tr.ms-tr:last-child'
                        ];

                        for (var s = 0; s < editableSelectors.length; s++) {
                            var selector = editableSelectors[s];
                            var candidate = document.querySelector(selector);
                            if (candidate && typeof candidate.getVueInstance === 'function') {
                                targetElement = candidate;
                                console.log('✅ Found editable element with selector: ' + selector);
                                break;
                            }
                        }
                    }

                    // Strategy 3: Look for any tr.ms-tr with Vue instance
                    if (!targetElement) {
                        console.log('🔍 Looking for any tr.ms-tr with Vue instance...');
                        var allTrs = document.querySelectorAll('tr.ms-tr');
                        console.log('🔍 Found ' + allTrs.length + ' tr.ms-tr elements');

                        for (var i = 0; i < allTrs.length; i++) {
                            var tr = allTrs[i];
                            if (typeof tr.getVueInstance === 'function') {
                                try {
                                    var vueTest = tr.getVueInstance();
                                    if (vueTest && typeof vueTest.setRowValue === 'function') {
                                        targetElement = tr;
                                        console.log('✅ Found suitable Vue row at index ' + i);
                                        break;
                                    }
                                } catch (e) {
                                    // Continue searching
                                }
                            }
                        }
                    }

                    if (!targetElement) {
                        if (retryCount < 3) {
                            console.log('⏳ Element not found, retrying in 1 second... (' + (retryCount + 1) + '/3)');
                            setTimeout(function() { executeVueInsertion(retryCount + 1); }, 1000);
                            return;
                        }
                        throw new Error('Could not find target element after 3 attempts');
                    }

                    console.log('✅ Target element found:', targetElement);

                    // Try getVueInstance method
                    if (typeof targetElement.getVueInstance === 'function') {
                        console.log('✅ Found getVueInstance method');
                        var vueInstance = targetElement.getVueInstance();

                        if (vueInstance && typeof vueInstance.setRowValue === 'function') {
                            console.log('✅ Found setRowValue method - inserting data...');
                            vueInstance.setRowValue(${JSON.stringify(data)});

                            window.postMessage({
                                type: 'VUE_GRID_INSERT_SUCCESS',
                                method: 'setRowValue',
                                message: 'Data inserted successfully!'
                            }, '*');
                            return;
                        }
                    }

                    // Try __vue__ property
                    if (targetElement.__vue__) {
                        console.log('✅ Found __vue__ property');
                        var vueInstance = targetElement.__vue__;

                        if (vueInstance && typeof vueInstance.setRowValue === 'function') {
                            console.log('✅ Found setRowValue on __vue__');
                            vueInstance.setRowValue(${JSON.stringify(data)});

                            window.postMessage({
                                type: 'VUE_GRID_INSERT_SUCCESS',
                                method: '__vue__',
                                message: 'Data inserted successfully via __vue__!'
                            }, '*');
                            return;
                        }
                    }

                    throw new Error('No suitable Vue.js method found');

                } catch (error) {
                    console.error('❌ Error in Vue insertion:', error);

                    if (retryCount < 3) {
                        setTimeout(function() { executeVueInsertion(retryCount + 1); }, 1000);
                    } else {
                        window.postMessage({
                            type: 'VUE_GRID_INSERT_ERROR',
                            message: error.message
                        }, '*');
                    }
                }
            }

            executeVueInsertion();
        })();
    `;
}

// Removed clipboard automation - using only automated strategies

// Send message to injected script (used by web accessible resource strategy)

// Send message to injected script
function sendVueInsertMessage(
    data: any,
    selector: string = 'tr.ms-tr.custom-class',
    rowIndex?: number
) {
    const logPrefix = rowIndex !== undefined ? `[Row ${rowIndex + 1}]` : '';
    console.log(`📤 ${logPrefix} Sending Vue insert message to injected script...`);

    const message = {
        type: 'VUE_GRID_INSERT_REQUEST',
        data: data,
        selector: selector,
        rowIndex: rowIndex
    };

    // Send message to page context
    window.postMessage(message, '*');
    console.log(`✅ ${logPrefix} Message sent to injected script with selector:`, selector);
}

// Removed unused injectVueScript function

// Test function for direct access (for debugging)
function testDirectVueAccess() {
    console.log('🧪 Testing direct Vue access from content script...');

    try {
        const element = document.querySelector('tr.ms-tr.custom-class') as any;
        console.log('🔍 Element found:', element);

        if (element) {
            console.log('🔍 Element className:', element.className);
            console.log('🔍 getVueInstance type:', typeof element.getVueInstance);
            console.log('🔍 __vue__ exists:', !!element.__vue__);

            // This will likely fail due to isolated world
            if (element.getVueInstance) {
                console.log('🔍 Trying to call getVueInstance...');
                const vueInstance = element.getVueInstance();
                console.log('🔍 Vue instance:', vueInstance);
            }
        }
    } catch (error) {
        console.error('❌ Direct access failed (expected in content script):', error);
        console.log(
            '💡 This is expected behavior in content script. Use script injection instead.'
        );
    }
}

// Debug function to explore Vue.js structure
function debugVueStructure() {
    console.log('🔍 === Vue.js Structure Debug ===');

    // Find all potential Vue elements
    const selectors = [
        'tr.ms-tr',
        'tr.ms-tr.custom-class',
        '.ms-tr',
        '.custom-class',
        'tr[class*="ms-tr"]',
        'table.ms-table tr'
    ];

    selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        console.log(`🔍 Selector "${selector}": ${elements.length} elements found`);

        elements.forEach((el, index) => {
            console.log(`  Element ${index}:`, el);
            console.log(`  Classes: ${el.className}`);
            console.log(`  Has __vue__: ${!!(el as any).__vue__}`);
            console.log(`  Has getVueInstance: ${!!(el as any).getVueInstance}`);
        });
    });
}

// Message listener for communication with injected script
window.addEventListener('message', event => {
    if (event.source !== window) return;

    if (event.data.type === 'VUE_GRID_INSERT_SUCCESS') {
        console.log('✅ Vue insertion successful via method:', event.data.method);
        showSimpleNotification('✅ Thành công! Đã chèn dữ liệu vào Vue.js Grid!', 'success');
    } else if (event.data.type === 'VUE_GRID_INSERT_ERROR') {
        console.error('❌ Vue insertion failed:', event.data.message);
        showSimpleNotification('❌ Lỗi: ' + event.data.message, 'error');
    }
});

// Input field data insertion by index
function insertDataToInputsByIndex(inputData: Array<{ index: number; value: string }>) {
    console.log('🚀 Starting input field data insertion by index...');
    console.log('📊 Input data:', inputData);

    try {
        // Find all input elements on the page
        const allInputs = document.querySelectorAll('input, textarea, select');
        console.log(`🔍 Found ${allInputs.length} input elements on page`);

        let successCount = 0;
        let failCount = 0;

        // Process each data entry
        inputData.forEach(({ index, value }) => {
            try {
                if (index < 0 || index >= allInputs.length) {
                    console.warn(`⚠️ Index ${index} is out of range (0-${allInputs.length - 1})`);
                    failCount++;
                    return;
                }

                const targetInput = allInputs[index] as
                    | HTMLInputElement
                    | HTMLTextAreaElement
                    | HTMLSelectElement;
                console.log(`📝 Filling input at index ${index} with value: "${value}"`);

                // Fill the input with the value
                fillInputByIndex(targetInput, value);
                successCount++;
                console.log(`✅ Successfully filled input at index ${index}`);
            } catch (error) {
                console.error(`❌ Error filling input at index ${index}:`, error);
                failCount++;
            }
        });

        // Show result notification
        if (successCount === inputData.length) {
            showSimpleNotification(
                `✅ Thành công! Đã điền ${successCount} input field!`,
                'success'
            );
        } else if (successCount > 0) {
            showSimpleNotification(
                `⚠️ Điền thành công ${successCount}/${inputData.length} field. ${failCount} field thất bại.`,
                'info'
            );
        } else {
            showSimpleNotification('❌ Không thể điền dữ liệu vào input fields', 'error');
        }
    } catch (error) {
        console.error('❌ Error in input field data insertion:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        showSimpleNotification('❌ Lỗi: ' + errorMessage, 'error');
    }
}

// Fill individual input by index with proper event handling
async function fillInputByIndex(
    input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
    value: string
): Promise<void> {
    console.log(`📝 Filling input element with value: "${value}"`);

    try {
        // Scroll element into view
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(100);

        // Focus the input
        input.focus();
        await sleep(50);

        // Clear existing value
        if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
            if (input.select) {
                input.select();
            } else if (input.setSelectionRange) {
                input.setSelectionRange(0, input.value.length);
            }
        }
        await sleep(50);

        // Set the value using multiple methods for compatibility
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value'
        )?.set;

        if (nativeInputValueSetter && input instanceof HTMLInputElement) {
            nativeInputValueSetter.call(input, value);
        } else {
            input.value = value;
        }

        // Dispatch comprehensive events to ensure compatibility
        const events = [
            new Event('input', { bubbles: true, cancelable: true }),
            new Event('change', { bubbles: true, cancelable: true }),
            new Event('blur', { bubbles: true, cancelable: true }),
            new KeyboardEvent('keydown', { bubbles: true, cancelable: true }),
            new KeyboardEvent('keyup', { bubbles: true, cancelable: true })
        ];

        for (const event of events) {
            input.dispatchEvent(event);
            await sleep(10);
        }

        // Additional Vue.js specific event handling
        if ((input as any).__vue__) {
            try {
                const vueInstance = (input as any).__vue__;
                if (vueInstance && vueInstance.$emit) {
                    vueInstance.$emit('input', value);
                    vueInstance.$emit('change', value);
                }
            } catch {
                console.log('Vue.js event triggering failed (expected in content script)');
            }
        }

        console.log(`✅ Successfully filled input with value: "${value}"`);
    } catch (error) {
        console.error('❌ Error filling input:', error);
        throw error;
    }
}

// Get all input elements with their index information for debugging
function getInputElementsInfo() {
    console.log('🔍 Getting input elements information...');

    const allInputs = document.querySelectorAll('input, textarea, select');
    const inputsInfo = Array.from(allInputs).map((input, index) => {
        const element = input as HTMLElement;
        return {
            index: index,
            tagName: element.tagName.toLowerCase(),
            type: (input as HTMLInputElement).type || 'N/A',
            name: (input as HTMLInputElement).name || '',
            id: element.id || '',
            placeholder: (input as HTMLInputElement).placeholder || '',
            className: element.className || '',
            value: (input as HTMLInputElement).value || '',
            visible: element.offsetParent !== null,
            enabled: !(input as HTMLInputElement).disabled
        };
    });

    console.table(inputsInfo);
    showSimpleNotification(
        `📊 Found ${inputsInfo.length} input elements. Check console for details.`,
        'info'
    );

    return inputsInfo;
}

// Chrome extension message handling
chrome.runtime.onMessage.addListener(message => {
    console.debug('Received message', message);

    if (message.type === 'INSERT_GRID_DATA') {
        insertDataToVueGrid();
        return false;
    }

    if (message.type === 'INSERT_INPUT_DATA') {
        if (message.data && Array.isArray(message.data)) {
            insertDataToInputsByIndex(message.data);
        } else {
            showSimpleNotification(
                '❌ Invalid input data format. Expected array of {index, value}',
                'error'
            );
        }
        return false;
    }

    if (message.type === 'GET_INPUT_INFO') {
        getInputElementsInfo();
        return false;
    }

    return false;
});

// Simple notification function
function showSimpleNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 16px;
        border-radius: 8px;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        font-size: 14px;
        z-index: 2147483648;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: all 0.3s ease-in-out;
        ${
            type === 'success'
                ? 'background: #4caf50;'
                : type === 'error'
                  ? 'background: #f44336;'
                  : 'background: #2196f3;'
        }
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Removed showAdvancedNotification - using only showSimpleNotification

// Create floating UI
function createFloatingUI() {
    console.log('Creating floating UI...');

    if (document.getElementById('chrome-extension-floating-ui')) {
        console.log('Floating UI already exists');
        return;
    }

    const container = document.createElement('div');
    container.id = 'chrome-extension-floating-ui';
    container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 2147483647;
    `;

    const floatingCard = document.createElement('div');
    floatingCard.id = 'floating-extension-card';
    floatingCard.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); border: 1px solid #e0e0e0;">
            <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                <div style="width: 8px; height: 8px; background: #4caf50; border-radius: 50%;"></div>
                <div style="display: flex; flex-direction: column;">
                    <span style="font-size: 14px; font-weight: 600; color: #333; margin: 0; line-height: 1.2;">Vue.js Grid Data Inserter</span>
                    <span style="font-size: 12px; color: #666; margin: 0; line-height: 1.2;">Chèn dữ liệu vào lưới Vue.js</span>
                </div>
            </div>
            <button id="floating-extension-button" style="
                width: 32px;
                height: 32px;
                border-radius: 8px;
                background: #2196f3;
                color: white;
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease-in-out;
                box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
            ">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
            </button>
        </div>
    `;
    floatingCard.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        pointer-events: auto;
        transition: all 0.2s ease-in-out;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    `;

    const floatingButton = floatingCard.querySelector(
        '#floating-extension-button'
    ) as HTMLButtonElement;

    const overlay = document.createElement('div');
    overlay.id = 'floating-extension-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 400px;
        max-height: 800px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        z-index: 2147483646;
        pointer-events: auto;
        display: none;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    `;

    overlay.innerHTML = `
        <div style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; font-size: 18px; font-weight: 600;">Vue.js Grid Data Inserter</h2>
                <button id="close-overlay" style="background: none; border: none; font-size: 20px; cursor: pointer; padding: 4px;">×</button>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin-bottom: 20px;">

            <div style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">Vue.js Grid Data Insertion (Multiple Rows)</h3>
                <p style="font-size: 12px; color: #666; margin-bottom: 16px;">
                    Chèn nhiều dòng dữ liệu vào lưới Vue.js. Hiện tại sẽ chèn 2 dòng mẫu.
                </p>

                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #333;">
                        Target Selector:
                    </label>
                    <input
                        id="target-selector-input"
                        type="text"
                        value="tr.ms-tr.custom-class"
                        placeholder="tr.ms-tr.custom-class"
                        style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; font-family: monospace; box-sizing: border-box;"
                    />
                    <div style="font-size: 10px; color: #666; margin-top: 4px;">
                        Ví dụ: tr.ms-tr.custom-class, .grid-row, #specific-row
                    </div>
                </div>
                <div style="display: flex; gap: 8px; margin-bottom: 16px;">
                    <button id="insert-grid-data-btn" style="padding: 12px 24px; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; flex: 1;">
                        � Auto Insert Data
                    </button>
                </div>
                <div style="display: flex; gap: 8px; margin-bottom: 16px;">
                    <button id="debug-vue-btn" style="padding: 8px 16px; background: #ff9800; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; flex: 1;">
                        🔍 Debug Vue Structure
                    </button>
                    <button id="test-direct-btn" style="padding: 8px 16px; background: #9c27b0; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; flex: 1;">
                        🧪 Test Direct Access
                    </button>
                </div>
                <div style="background: #f5f5f5; padding: 12px; border-radius: 4px; font-size: 12px; font-family: monospace;">
                    <strong>Method:</strong> Web Accessible Resource Injection<br>
                    <strong>Current Target:</strong> <span id="current-target-display">tr.ms-tr.custom-class</span>
                </div>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">Input Fields Data Insertion</h3>
                <p style="font-size: 12px; color: #666; margin-bottom: 16px;">
                    Điền dữ liệu vào các input field dựa trên index. Format: [{"index": 0, "value": "text"}]
                </p>

                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #333;">
                        Input Data (JSON Array):
                    </label>
                    <textarea
                        id="input-data-textarea"
                        placeholder='[{"index": 0, "value": "Sample text"}, {"index": 1, "value": "Another value"}]'
                        style="width: 100%; height: 80px; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 11px; font-family: monospace; box-sizing: border-box; resize: vertical;"
                    ></textarea>
                    <div style="font-size: 10px; color: #666; margin-top: 4px;">
                        Ví dụ: [{"index": 0, "value": "Text 1"}, {"index": 2, "value": "Text 2"}]
                    </div>
                </div>

                <div style="display: flex; gap: 8px; margin-bottom: 16px;">
                    <button id="insert-input-data-btn" style="padding: 12px 24px; background: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; flex: 1;">
                        📝 Fill Input Fields
                    </button>
                    <button id="get-input-info-btn" style="padding: 12px 24px; background: #ff9800; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; flex: 1;">
                        🔍 Get Input Info
                    </button>
                </div>

                <div style="background: #e3f2fd; padding: 12px; border-radius: 4px; font-size: 12px;">
                    <strong>Tip:</strong> Sử dụng "Get Input Info" để xem danh sách tất cả input fields và index của chúng.
                </div>
            </div>

            <hr style="border: none; border-top: 1px solid #eee; margin-bottom: 20px;">

            <div style="text-align: center;">
                <button id="dashboard-btn" style="padding: 12px 24px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; min-width: 120px;">
                    Dashboard
                </button>
            </div>
        </div>
    `;

    container.appendChild(floatingCard);
    container.appendChild(overlay);
    document.body.appendChild(container);

    console.log('Floating UI elements added to DOM');

    let isOverlayOpen = false;

    // Event handlers
    floatingButton.addEventListener('click', () => {
        console.log('Floating button clicked');
        isOverlayOpen = !isOverlayOpen;
        overlay.style.display = isOverlayOpen ? 'block' : 'none';
        floatingButton.style.background = isOverlayOpen ? '#f44336' : '#2196f3';
    });

    document.getElementById('close-overlay')?.addEventListener('click', () => {
        isOverlayOpen = false;
        overlay.style.display = 'none';
        floatingButton.style.background = '#2196f3';
    });

    document.getElementById('insert-grid-data-btn')?.addEventListener('click', () => {
        const selectorInput = document.getElementById('target-selector-input') as HTMLInputElement;
        const selector = selectorInput?.value.trim() || 'tr.ms-tr.custom-class';

        // Update display
        const displayElement = document.getElementById('current-target-display');
        if (displayElement) {
            displayElement.textContent = selector;
        }

        insertDataToVueGrid(selector);
    });

    // Update display when input changes
    document.getElementById('target-selector-input')?.addEventListener('input', e => {
        const target = e.target as HTMLInputElement;
        const selector = target.value.trim() || 'tr.ms-tr.custom-class';
        const displayElement = document.getElementById('current-target-display');
        if (displayElement) {
            displayElement.textContent = selector;
        }
    });

    document.getElementById('debug-vue-btn')?.addEventListener('click', () => {
        debugVueStructure();
        showSimpleNotification('Debug information logged to console', 'info');
    });

    document.getElementById('test-direct-btn')?.addEventListener('click', () => {
        testDirectVueAccess();
        showSimpleNotification('Direct test executed - check console', 'info');
    });

    // Input fields data insertion event handlers
    document.getElementById('insert-input-data-btn')?.addEventListener('click', () => {
        const textarea = document.getElementById('input-data-textarea') as HTMLTextAreaElement;
        const inputDataText = textarea?.value.trim();

        if (!inputDataText) {
            showSimpleNotification('❌ Please enter input data in JSON format', 'error');
            return;
        }

        try {
            const inputData = JSON.parse(inputDataText);

            if (!Array.isArray(inputData)) {
                showSimpleNotification('❌ Input data must be an array', 'error');
                return;
            }

            // Validate data format
            const isValidFormat = inputData.every(
                item =>
                    typeof item === 'object' &&
                    typeof item.index === 'number' &&
                    typeof item.value === 'string'
            );

            if (!isValidFormat) {
                showSimpleNotification(
                    '❌ Invalid format. Expected: [{"index": number, "value": "string"}]',
                    'error'
                );
                return;
            }

            insertDataToInputsByIndex(inputData);
        } catch (error) {
            showSimpleNotification('❌ Invalid JSON format', 'error');
            console.error('JSON parse error:', error);
        }
    });

    document.getElementById('get-input-info-btn')?.addEventListener('click', () => {
        getInputElementsInfo();
    });

    document.getElementById('dashboard-btn')?.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
    });

    // Hover effects
    floatingCard.addEventListener('mouseenter', () => {
        floatingCard.style.transform = 'scale(1.02)';
        floatingButton.style.background = '#1976d2';
    });

    floatingCard.addEventListener('mouseleave', () => {
        floatingCard.style.transform = 'scale(1)';
        floatingButton.style.background = isOverlayOpen ? '#f44336' : '#2196f3';
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createFloatingUI);
} else {
    createFloatingUI();
}

console.debug('Chrome extension content script loaded with Vue.js Grid Data Inserter');

export {};
