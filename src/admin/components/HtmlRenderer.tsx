import React, { useEffect, useState } from 'react';

// import parse, { Element, HTMLReactParserOptions, domToReact } from 'html-react-parser';

import { Container, GlobalStyles, Paper } from '@mui/material';

const htmlRendererStyles = (
    <GlobalStyles
        styles={{
            '.html-renderer': {
                fontFamily: 'Times New Roman, serif',
                lineHeight: 1.4,
                '& input[type="text"], & input[type="date"], & input[type="tel"], & input[type="number"]':
                    {
                        border: '1px solid #aaa',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '14px',
                        fontFamily: 'Times New Roman, serif',
                        minWidth: '120px'
                    },
                '& select': {
                    border: '1px solid #aaa',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '14px',
                    fontFamily: 'Times New Roman, serif'
                },
                '& textarea': {
                    border: '1px solid #aaa',
                    borderRadius: '4px',
                    padding: '4px 6px',
                    fontSize: '14px',
                    fontFamily: 'Times New Roman, serif',
                    width: '98%',
                    minHeight: '36px',
                    resize: 'vertical'
                },
                '& input[type="checkbox"]': {
                    width: '16px',
                    height: '16px',
                    margin: '0 4px'
                },
                '& table': {
                    width: '100%',
                    borderCollapse: 'collapse',
                    marginBottom: '20px',
                    '& th, & td': {
                        border: '1px solid #444',
                        padding: '6px',
                        fontSize: '13px',
                        fontFamily: 'Times New Roman, serif'
                    },
                    '& th': {
                        backgroundColor: '#f5f5f5',
                        fontWeight: 'bold',
                        textAlign: 'center'
                    }
                },
                '& h1, & h2, & h3': {
                    textAlign: 'center',
                    fontFamily: 'Times New Roman, serif',
                    margin: '10px 0'
                },
                '& .header, & .footer': {
                    textAlign: 'center'
                },
                '& .section-title': {
                    fontWeight: 'bold',
                    marginTop: '30px',
                    marginBottom: '10px'
                },
                '& .note': {
                    fontSize: '13px',
                    color: '#444',
                    fontStyle: 'italic'
                },
                '& .center': {
                    textAlign: 'center'
                },
                '& .no-border': {
                    border: 'none !important'
                },
                '& .short': {
                    width: '80px'
                }
            },
            '@media print': {
                '.print-hide': {
                    display: 'none !important'
                },
                '.html-renderer': {
                    '& input, & select, & textarea': {
                        border: 'none !important',
                        background: 'none !important',
                        boxShadow: 'none !important',
                        fontFamily: 'Times New Roman, serif !important',
                        color: '#000 !important'
                    },
                    '& input[type="checkbox"]': {
                        width: '14px',
                        height: '14px'
                    }
                },
                body: {
                    margin: '20px !important',
                    fontFamily: 'Times New Roman, serif !important'
                }
            }
        }}
    />
);

interface HtmlRendererProps {
    htmlContent?: string;
    title?: string;
    onSave?: (data: any) => void;
    onPrint?: () => void;
}

export const HtmlRenderer: React.FC<HtmlRendererProps> = ({
    htmlContent = '',
    onSave,
    onPrint
}) => {
    const [formData, setFormData] = useState<{ [key: string]: any }>({});

    const handleInputChange = (
        event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value, type } = event.target;

        if (type === 'checkbox') {
            const checkbox = event.target as HTMLInputElement;
            setFormData(prev => ({
                ...prev,
                [name]: checkbox.checked
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handlePrint = () => {
        // Sync form data to HTML attributes before printing
        const container = document.querySelector('.html-renderer');
        if (container) {
            const inputs = container.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                const element = input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
                if (element.type === 'checkbox') {
                    const checkbox = element as HTMLInputElement;
                    if (checkbox.checked) {
                        checkbox.setAttribute('checked', 'checked');
                    } else {
                        checkbox.removeAttribute('checked');
                    }
                } else if (element.tagName === 'SELECT') {
                    const select = element as HTMLSelectElement;
                    Array.from(select.options).forEach(option => {
                        if (option.selected) {
                            option.setAttribute('selected', 'selected');
                        } else {
                            option.removeAttribute('selected');
                        }
                    });
                } else {
                    // For text inputs, number inputs, textarea
                    element.setAttribute('value', element.value);
                }
            });
        }
        if (onPrint) {
            onPrint();
        } else {
            window.print();
        }
    };

    const handleSave = () => {
        if (onSave) {
            onSave(formData);
        } else {
            console.log('Form data:', formData);
            alert('Form data saved to console!');
        }
    };

    // Add event listeners after render
    useEffect(() => {
        const container = document.querySelector('.html-renderer');
        if (!container) return;

        // Handle form inputs
        const inputs = container.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            const element = input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
            element.addEventListener('change', handleInputChange as any);
            element.addEventListener('input', handleInputChange as any);
        });

        // Handle buttons
        const printButtons = container.querySelectorAll(
            'button[onclick*="window.print"], #print-btn'
        );
        const saveButtons = container.querySelectorAll('button[onclick*="handleSave"], #save-btn');

        printButtons.forEach(button => {
            button.addEventListener('click', e => {
                e.preventDefault();
                handlePrint();
            });
        });

        saveButtons.forEach(button => {
            button.addEventListener('click', e => {
                e.preventDefault();
                handleSave();
            });
        });

        return () => {
            inputs.forEach(input => {
                const element = input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
                element.removeEventListener('change', handleInputChange as any);
                element.removeEventListener('input', handleInputChange as any);
            });

            printButtons.forEach(button => {
                button.removeEventListener('click', handlePrint);
            });

            saveButtons.forEach(button => {
                button.removeEventListener('click', handleSave);
            });
        };
    }, [htmlContent]);

    return (
        <>
            {/* {htmlRendererStyles} */}
            <Container maxWidth="lg">
                <Paper elevation={3} sx={{ p: 3, mt: 2 }}>
                    {/* HTML Content Renderer */}
                    <div
                        className="html-renderer"
                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />
                </Paper>
            </Container>
        </>
    );
};
