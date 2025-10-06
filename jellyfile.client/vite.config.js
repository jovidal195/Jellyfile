import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        https: false, // <- désactive HTTPS en dev
        proxy: {
            '/api': {
                target: 'http://localhost:5291', // backend HTTP
                changeOrigin: true,
                secure: false,
            },
        },
    },
});
