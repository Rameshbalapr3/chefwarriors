/// <reference types="vite/client" />

interface ImportMetaEnv {
 readonly VITE_POS_CLOUD?: string;
}

interface ImportMeta {
 readonly env: ImportMetaEnv;
}
