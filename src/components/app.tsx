import React, { FunctionComponent } from 'react';
import styled from 'styled-components';
import { ZakekeEnvironment, ZakekeViewer, ZakekeProvider } from 'zakeke-configurator-react';
import Selector from './selector';

// Allow reading bootstrap params that we inject via URL or a window shim
declare global {
  interface Window {
    __ZAKEKE_BOOT_PARAMS__?: Record<string, any>;
  }
}

function decodeBase64Json(input?: string | null) {
  if (!input) return undefined;
  try {
    const json = decodeURIComponent(escape(atob(String(input))));
    return JSON.parse(json);
  } catch (_) {
    return undefined;
  }
}

function getBootstrapParameters(): Record<string, any> {
  const params = new URLSearchParams(window.location.search);
  const urlParameters: Record<string, any> = Object.fromEntries(params.entries());

  // If attributes are passed as base64 JSON in `attrs_b64`, decode them
  const decodedAttrs = decodeBase64Json(urlParameters["attrs_b64"]);
  if (decodedAttrs) {
    urlParameters["attributes"] = decodedAttrs;
  }

  // Merge with any pre-baked params that the host page defines
  const shim = (window as any).__ZAKEKE_BOOT_PARAMS__ || {};
  return { ...urlParameters, ...shim };
}

const Layout = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-gap: clamp(10px, 2vw, 24px);
  width: 100%;
  height: 100%;
  max-height: 100%;
  min-height: 0;
  padding: clamp(10px, 2vw, 24px);
  box-sizing: border-box;
  overflow: hidden;

  @media (max-width: 767px) {
    display: flex;
    flex-direction: column;
    padding: 10px;
    gap: 12px;
  }
`;

const SelectorPanel = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100%;
  min-height: 0;
  overflow: hidden;

  @media (max-width: 767px) {
    order: 1;
    flex: 0 0 40%;
  }
`;

const ViewerPanel = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100%;
  min-height: 0;
  overflow: hidden;

  @media (max-width: 767px) {
    order: 0;
    flex: 0 0 60%;
  }
`;

const ViewerStage = styled.div`
  position: relative;
  flex: 1 1 auto;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;

  * {
    scrollbar-width: none;
  }

  *::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;
  }

  > div {
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: hidden !important;
  }

  [id^='zakeke-canvas-viewer3D-div-'] {
    position: absolute !important;
    inset: 0;
    width: 100% !important;
    height: 100% !important;
    overflow: hidden !important;
  }

  canvas[id^='zakeke-canvas-viewer3D-'] {
    display: block;
    width: 100% !important;
    height: 100% !important;
    max-width: 100% !important;
    max-height: 100% !important;
  }
`;

const zakekeEnvironment = new ZakekeEnvironment();

type AppMode = 'full' | 'lite';

const LITE_PRODUCT_CODES = new Set([
  '10532134027610',
  '10781413704026'
]);

const FULL_PRODUCT_CODES = new Set([
  '10197521465690',
  '10243095429466',
  '10243096445274',
  '10243100311898',
]);

const resolveMode = (modelCode?: string): AppMode => {
  const code = (modelCode || '').trim();
  if (LITE_PRODUCT_CODES.has(code)) {
    console.log("lite mode activated for product code", code);
    return 'lite';
  }
  if (FULL_PRODUCT_CODES.has(code)) {
    console.log("full mode activated for product code", code);
    return 'full';
  }
  console.log("no mode identified, reverted to full mode for product code", code);
  return 'full';
};

const App: FunctionComponent<{}> = () => {
    const bootstrapParameters = getBootstrapParameters();
    const modelCode = String(bootstrapParameters.modelCode ?? bootstrapParameters.modelcode ?? '');
    const mode = resolveMode(modelCode);
    const defaultBottleName = String(
      bootstrapParameters.bottleName ??
      bootstrapParameters.defaultBottleName ??
      'antica'
    );
    return <ZakekeProvider environment={zakekeEnvironment} parameters={{ ...bootstrapParameters, appMode: mode }}>
        <Layout>
            <SelectorPanel>
                <Selector mode={mode} defaultBottleName={defaultBottleName} />
            </SelectorPanel>
            <ViewerPanel>
                <ViewerStage>
                    <ZakekeViewer />
                </ViewerStage>
            </ViewerPanel>
        </Layout>
    </ZakekeProvider>;
}

export default App; 
