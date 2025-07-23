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
