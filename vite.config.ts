import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

import { crx } from '@crxjs/vite-plugin';
import TanStackRouterVite from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';

import manifest from './manifest.json';
import packageJson from './package.json';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        TanStackRouterVite({
            autoCodeSplitting: true,
            routesDirectory: path.join(__dirname, 'src/popup/routes'),
            generatedRouteTree: path.join(__dirname, 'src/popup/routeTree.gen.ts')
        }),
        TanStackRouterVite({
            autoCodeSplitting: true,
            routesDirectory: path.join(__dirname, 'src/admin/routes'),
            generatedRouteTree: path.join(__dirname, 'src/admin/routeTree.gen.ts')
        }),
        {
            name: 'custom-template-save-api',
            configureServer(server) {
                server.middlewares.use('/api/save-custom-template', (req, res, _next) => {
                    if (req.method !== 'POST') {
                        res.statusCode = 405;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ success: false, error: 'Method Not Allowed' }));
                        return;
                    }

                    let body = '';
                    req.on('data', chunk => {
                        body += chunk;
                    });
                    req.on('end', () => {
                        try {
                            const parsed = JSON.parse(body || '{}');
                            const code: string = String(parsed.code || '').trim();
                            const fileName: string = String(parsed.fileName || '').trim();
                            const fileBase64: string = String(parsed.fileBase64 || '');

                            if (!code || !fileName || !fileBase64) {
                                res.statusCode = 400;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(
                                    JSON.stringify({
                                        success: false,
                                        error: 'Missing required fields: code, fileName, fileBase64'
                                    })
                                );
                                return;
                            }

                            const safeCode = code.replace(/[\\/]/g, '_');
                            const safeFileName = fileName.replace(/[^\w\s\-.]/g, '_');
                            const targetDir = path.join(
                                process.cwd(),
                                'public',
                                'templates_by_code',
                                safeCode,
                                'custom'
                            );
                            fs.mkdirSync(targetDir, { recursive: true });
                            const targetPath = path.join(targetDir, safeFileName);

                            const buffer = Buffer.from(fileBase64, 'base64');
                            fs.writeFileSync(targetPath, buffer);

                            res.statusCode = 200;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(
                                JSON.stringify({
                                    success: true,
                                    path: targetPath
                                })
                            );
                        } catch (e: any) {
                            res.statusCode = 500;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(
                                JSON.stringify({
                                    success: false,
                                    error: e?.message || 'Server error'
                                })
                            );
                        }
                    });
                });
            }
        },
        crx({
            manifest: {
                ...manifest,
                version: packageJson.version
            }
        })
    ],
    resolve: {
        alias: {
            '@': path.join(__dirname, './src'),
            '@admin': path.join(__dirname, './src/admin'),
            '@popup': path.join(__dirname, './src/popup'),
            '@shared': path.join(__dirname, './src/shared')
        }
    },
    base: './',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        chunkSizeWarningLimit: 1000, // Increase warning limit to 1MB
        rollupOptions: {
            input: {
                popup: path.resolve(__dirname, 'src/popup/index.html'),
                admin: path.resolve(__dirname, 'src/admin/index.html')
            },
            output: {
                manualChunks: {
                    // Separate large libraries into their own chunks
                    'word-processing': ['mammoth', 'docxtemplater', 'pizzip'],
                    'ui-libs': [
                        '@mui/material',
                        '@mui/icons-material',
                        '@emotion/react',
                        '@emotion/styled'
                    ],
                    'canvas-libs': ['fabric', 'html2canvas'],
                    'pdf-libs': ['jspdf', 'pdf-lib', '@react-pdf/renderer'],
                    vendor: ['react', 'react-dom', '@tanstack/react-router']
                }
            }
        }
    }
});
