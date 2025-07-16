// Vue.js Grid Data Injector - Runs in page context
// This script has access to page's JavaScript objects including Vue.js

console.log('🚀 Hello word');

// Listen for messages from content script
window.addEventListener('message', function(event) {
    // Only accept messages from same window
    if (event.source !== window) return;
    
    // Check if this is our Vue grid insert request
    if (event.data.type !== 'VUE_GRID_INSERT_REQUEST') return;
    
    console.log('📝 Received Vue grid insert request:', event.data);
    
    function executeVueInsertion(retryCount = 0) {
        try {
            var rowIndex = event.data.rowIndex;
            var logPrefix = rowIndex !== undefined ? '[Row ' + (rowIndex + 1) + ']' : '';
            console.log('🔄 ' + logPrefix + ' Page context attempt ' + (retryCount + 1) + ' to insert data...');

            // Get selector from message or use default
            var selector = event.data.selector || 'tr.ms-tr.custom-class';
            console.log('🎯 ' + logPrefix + ' Using selector:', selector);

            // For multiple rows, we need to create new rows using the insert button approach
            var targetElement = null;

            // Find the modal and table first
            var listModal = document.querySelectorAll(".vfm__content.modal-content")[0];
            if (!listModal) {
                console.log('❌ ' + logPrefix + ' Modal not found');
                throw new Error('Modal not found');
            }

            var listTable = listModal.querySelectorAll('table.ms-table');
            var indexTable = 0;
            var firstTable = listTable[indexTable];

            if (!firstTable) {
                console.log('❌ ' + logPrefix + ' Table not found');
                throw new Error('Table not found');
            }

            console.log('✅ ' + logPrefix + ' Found modal and table');

            // Get all existing rows before adding new one
            var allTableRows = firstTable.querySelectorAll('tr.ms-tr.custom-class');
            var soLuongTr = allTableRows.length;
            console.log('🔍 ' + logPrefix + ' Current rows count:', soLuongTr);

            if (rowIndex !== undefined && rowIndex > 0) {
                // For subsequent rows, we need to create a new row first
                console.log('🔄 ' + logPrefix + ' Creating new row for multi-row insertion...');

                if (allTableRows.length > 0) {
                    // Get the last row
                    var lastTr = allTableRows[allTableRows.length - 1];
                    var allTdInLastTr = lastTr.querySelectorAll('td');

                    if (allTdInLastTr.length > 0) {
                        // Get the last td and find the insert button
                        var lastTd = allTdInLastTr[allTdInLastTr.length - 1];
                        var insertButton = lastTd.querySelector('.row-editor-action.insert');

                        if (insertButton) {
                            console.log('✅ ' + logPrefix + ' Found insert button, clicking...');
                            insertButton.click();

                            // Wait for new row to be created and then continue
                            setTimeout(function() {
                                // Update the rows list after adding new row
                                allTableRows = firstTable.querySelectorAll('tr.ms-tr.custom-class');
                                if (soLuongTr === allTableRows.length) {
                                    console.log('❌ ' + logPrefix + ' No new row created after clicking insert');
                                    throw new Error('No new row created after clicking insert');
                                }

                                console.log('✅ ' + logPrefix + ' New row created, rows count:', allTableRows.length);

                                // Get the newly created row (last row)
                                var newRow = allTableRows[allTableRows.length - 1];

                                // Continue with data insertion for the new row
                                insertDataIntoRow(newRow, event.data.data, logPrefix);

                            }, 500);
                            return;
                        } else {
                            console.log('❌ ' + logPrefix + ' Insert button not found');
                            throw new Error('Insert button not found');
                        }
                    }
                }
            } else {
                // For first row, try to find existing target element
                targetElement = document.querySelector(selector);
                if (targetElement) {
                    console.log('✅ ' + logPrefix + ' Found target element with selector:', selector);
                } else {
                    // Try to find any suitable row
                    if (allTableRows.length > 0) {
                        targetElement = allTableRows[allTableRows.length - 1];
                        console.log('✅ ' + logPrefix + ' Using last existing row as target');
                    }
                }
            }

            if (!targetElement) {
                if (retryCount < 5) {
                    console.log('⏳ ' + logPrefix + ' Element not found, retrying in 1 second... (' + (retryCount + 1) + '/5)');
                    setTimeout(function() { executeVueInsertion(retryCount + 1); }, 1000);
                    return;
                }
                throw new Error('Could not find target element after 5 attempts');
            }

            // Insert data into the target row
            insertDataIntoRow(targetElement, event.data.data, logPrefix);

        } catch (error) {
            var rowIndex = event.data.rowIndex;
            var logPrefix = rowIndex !== undefined ? '[Row ' + (rowIndex + 1) + ']' : '';
            console.error('❌ ' + logPrefix + ' Error in Vue insertion:', error);

            if (retryCount < 5) {
                console.log('⏳ ' + logPrefix + ' Error occurred, retrying in 1 second... (' + (retryCount + 1) + '/5)');
                setTimeout(function() { executeVueInsertion(retryCount + 1); }, 1000);
            } else {
                // Send error message
                window.postMessage({
                    type: 'VUE_GRID_INSERT_ERROR',
                    message: logPrefix + ' ' + error.message,
                    rowIndex: rowIndex
                }, '*');
            }
        }
    }

    // Function to insert data into a specific row
    function insertDataIntoRow(targetElement, data, logPrefix) {
        try {
            console.log('✅ ' + logPrefix + ' Target element found:', targetElement);
            console.log('🔍 ' + logPrefix + ' Element classes:', targetElement.className);
            console.log('🔍 ' + logPrefix + ' Has getVueInstance:', typeof targetElement.getVueInstance);

            // Check if getVueInstance exists
            if (typeof targetElement.getVueInstance !== 'function') {
                console.log('🔍 ' + logPrefix + ' getVueInstance not found, checking for __vue__...');

                if (targetElement.__vue__) {
                    console.log('✅ ' + logPrefix + ' Found __vue__ property');
                    // Try to access Vue instance directly
                    var vueInstance = targetElement.__vue__;
                    if (vueInstance && typeof vueInstance.setRowValue === 'function') {
                        console.log('✅ ' + logPrefix + ' Found setRowValue on __vue__');
                        vueInstance.setRowValue(data);
                        window.postMessage({
                            type: 'VUE_GRID_INSERT_SUCCESS',
                            method: '__vue__',
                            message: logPrefix + ' Data inserted successfully via __vue__',
                            rowIndex: event.data.rowIndex
                        }, '*');
                        return;
                    }
                }

                throw new Error('getVueInstance method not found on element');
            }

            // Call getVueInstance
            var vueInstance = targetElement.getVueInstance();
            console.log('✅ ' + logPrefix + ' Got Vue instance:', vueInstance);

            if (!vueInstance) {
                throw new Error('Vue instance is null or undefined');
            }

            console.log('🔍 ' + logPrefix + ' Vue instance methods:', Object.getOwnPropertyNames(vueInstance));

            // Check if setRowValue exists
            if (typeof vueInstance.setRowValue !== 'function') {
                console.log('🔍 ' + logPrefix + ' setRowValue not found, checking alternative methods...');

                // Try alternative method names
                var alternatives = ['setRowData', 'updateRow', 'insertRow', 'addRow'];
                var methodFound = false;

                for (var k = 0; k < alternatives.length; k++) {
                    var methodName = alternatives[k];
                    if (typeof vueInstance[methodName] === 'function') {
                        console.log('✅ ' + logPrefix + ' Found alternative method: ' + methodName);
                        vueInstance[methodName](data);
                        window.postMessage({
                            type: 'VUE_GRID_INSERT_SUCCESS',
                            method: methodName,
                            message: logPrefix + ' Data inserted successfully via ' + methodName,
                            rowIndex: event.data.rowIndex
                        }, '*');
                        methodFound = true;
                        break;
                    }
                }

                if (!methodFound) {
                    throw new Error('No suitable method found on Vue instance');
                }
                return;
            }

            // Call setRowValue
            console.log('✅ ' + logPrefix + ' Calling setRowValue with data...');
            vueInstance.setRowValue(data);
            console.log('✅ ' + logPrefix + ' Data insertion completed successfully!');

            // Send success message
            window.postMessage({
                type: 'VUE_GRID_INSERT_SUCCESS',
                method: 'setRowValue',
                message: logPrefix + ' Data inserted successfully via setRowValue',
                rowIndex: event.data.rowIndex
            }, '*');

        } catch (error) {
            console.error('❌ ' + logPrefix + ' Error in insertDataIntoRow:', error);
            window.postMessage({
                type: 'VUE_GRID_INSERT_ERROR',
                message: logPrefix + ' ' + error.message,
                rowIndex: event.data.rowIndex
            }, '*');
        }
    }

    // Start execution
    executeVueInsertion();
});

console.log('✅ Vue Grid Injector ready to receive messages');
