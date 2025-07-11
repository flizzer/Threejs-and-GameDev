import { defineConfig } from 'vite';
import restart from 'vite-plugin-restart';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        restart({ restart: ['public/**']})
    ],
    resolve: {
        alias: {
        },
    },
    build: {
        sourcemap: true,
        emptyOutDir: true,
    },
    server: {
        port: 5200,
        hmr: {
            clientPort: 5200,
        }
    },
    //commenting out because this doesn't output the local web server URL --bhd
    //and isn't included in previous vite.configs
    //logLevel: "warn", 
    base: "/"
});
