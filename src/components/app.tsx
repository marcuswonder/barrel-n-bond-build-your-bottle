import React, { FunctionComponent, useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { ZakekeEnvironment, ZakekeViewer, ZakekeProvider } from 'zakeke-configurator-react';
import Selector from './selector';
import { resolveParentMessagingConfig } from '../utils/postMessage';

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

type DragInputMode = 'touch' | 'mouse';
type DragStep = 'down' | 'move' | 'up';
type DragDirection = 'right' | 'left';

const VIEWER_CANVAS_SELECTOR = "canvas[id^='zakeke-canvas-viewer3D-']";
const VIEWER_GESTURE_START_DELAY_MS = 1400; // 900ms baseline + 500ms requested delay
const CONFIGURATOR_START_MESSAGE_TYPE = 'configuratorStartClicked';

const { trustedOrigins: trustedMessageOrigins } = resolveParentMessagingConfig();

const resolveInputMode = (): DragInputMode => {
  const hasCoarsePointer =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;

  if (hasCoarsePointer || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)) {
    return 'touch';
  }
  return 'mouse';
};

const dispatchSimulatedDragEvent = (
  target: HTMLElement,
  step: DragStep,
  clientX: number,
  clientY: number,
  mode: DragInputMode
): void => {
  const pointerEventName = step === 'down' ? 'pointerdown' : step === 'move' ? 'pointermove' : 'pointerup';
  const touchEventName = step === 'down' ? 'touchstart' : step === 'move' ? 'touchmove' : 'touchend';
  const mouseEventName = step === 'down' ? 'mousedown' : step === 'move' ? 'mousemove' : 'mouseup';

  const commonMousePointerInit = {
    bubbles: true,
    cancelable: true,
    composed: true,
    clientX,
    clientY,
    button: 0,
    buttons: step === 'up' ? 0 : 1,
  };

  if (typeof window.PointerEvent === 'function') {
    target.dispatchEvent(
      new PointerEvent(pointerEventName, {
        ...commonMousePointerInit,
        pointerId: 1,
        pointerType: mode,
        isPrimary: true,
        pressure: step === 'up' ? 0 : 0.45,
      })
    );
    return;
  }

  if (mode === 'touch' && typeof window.Touch === 'function' && typeof window.TouchEvent === 'function') {
    try {
      const touchPoint = new Touch({
        identifier: 1,
        target,
        clientX,
        clientY,
        pageX: clientX + window.scrollX,
        pageY: clientY + window.scrollY,
        screenX: clientX,
        screenY: clientY,
        radiusX: 15,
        radiusY: 15,
        force: step === 'up' ? 0 : 0.45,
      });

      const activeTouches = step === 'up' ? [] : [touchPoint];
      target.dispatchEvent(
        new TouchEvent(touchEventName, {
          bubbles: true,
          cancelable: true,
          composed: true,
          touches: activeTouches,
          targetTouches: activeTouches,
          changedTouches: [touchPoint],
        })
      );
      return;
    } catch {
      // Fall back to mouse events where Touch constructor is unavailable/restricted.
    }
  }

  target.dispatchEvent(new MouseEvent(mouseEventName, commonMousePointerInit));
};

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

const ViewerGestureOverlay = styled.div<{ $visible: boolean }>`
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  background: transparent;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transition: opacity 220ms ease;
`;

const ViewerGesturePrompt = styled.div`
  position: absolute;
  left: 50%;
  bottom: clamp(12px, 2vw, 22px);
  transform: translateX(-50%);
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(16, 16, 16, 0.72);
  color: #ffffff;
  font-size: 12px;
  line-height: 1;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
`;

const ViewerGestureTouchPoint = styled.div<{ $pressed: boolean; $mode: DragInputMode }>`
  position: absolute;
  left: 0;
  top: 0;
  width: ${({ $mode }) => ($mode === 'touch' ? '34px' : '22px')};
  height: ${({ $mode }) => ($mode === 'touch' ? '34px' : '22px')};
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.92);
  background: rgba(255, 255, 255, 0.25);
  box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.45);
  transform: translate(-50%, -50%) scale(${({ $pressed }) => ($pressed ? 0.88 : 1)});
  transition: transform 110ms ease;
  will-change: transform, left, top;

  &::after {
    content: '';
    position: absolute;
    inset: -8px;
    border-radius: 999px;
    border: 2px solid rgba(255, 255, 255, 0.45);
    animation: hint-ripple 1100ms ease-out infinite;
    opacity: ${({ $pressed }) => ($pressed ? 1 : 0.75)};
  }

  @keyframes hint-ripple {
    0% {
      transform: scale(0.75);
      opacity: 0.7;
    }
    100% {
      transform: scale(1.3);
      opacity: 0;
    }
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

const ViewerGestureHint: FunctionComponent<{ stageRef: React.RefObject<HTMLDivElement>; isEnabled: boolean }> = ({
  stageRef,
  isEnabled
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [inputMode, setInputMode] = useState<DragInputMode>(resolveInputMode);
  const [cursorPoint, setCursorPoint] = useState({ x: 0, y: 0 });

  const hasStartedRef = useRef(false);
  const isStoppedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const startDelayRef = useRef<number | null>(null);
  const pauseRef = useRef<number | null>(null);
  const fadeOutRef = useRef<number | null>(null);

  const clearAsyncHandles = useCallback(() => {
    if (rafRef.current != null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (startDelayRef.current != null) {
      window.clearTimeout(startDelayRef.current);
      startDelayRef.current = null;
    }
    if (pauseRef.current != null) {
      window.clearTimeout(pauseRef.current);
      pauseRef.current = null;
    }
    if (fadeOutRef.current != null) {
      window.clearTimeout(fadeOutRef.current);
      fadeOutRef.current = null;
    }
  }, []);

  const stopHint = useCallback(() => {
    isStoppedRef.current = true;
    clearAsyncHandles();
    setIsPressed(false);
    setIsVisible(false);
  }, [clearAsyncHandles]);

  const wait = useCallback((durationMs: number): Promise<void> => {
    return new Promise((resolve) => {
      pauseRef.current = window.setTimeout(() => {
        pauseRef.current = null;
        resolve();
      }, durationMs);
    });
  }, []);

  const playSingleDrag = useCallback((canvas: HTMLCanvasElement, direction: DragDirection): Promise<void> => {
    return new Promise((resolve) => {
      const stage = stageRef.current;
      if (!stage || isStoppedRef.current) {
        resolve();
        return;
      }

      const mode = resolveInputMode();
      const bounds = stage.getBoundingClientRect();
      const touchY = bounds.height * 0.58;
      const centerX = bounds.width * 0.5;
      const dragDistance = bounds.width * 0.14;
      const startX = direction === 'right' ? centerX - dragDistance : centerX + dragDistance;
      const endX = direction === 'right' ? centerX + dragDistance : centerX - dragDistance;

      setInputMode(mode);
      setCursorPoint({ x: startX, y: touchY });
      setIsPressed(true);

      dispatchSimulatedDragEvent(canvas, 'down', bounds.left + startX, bounds.top + touchY, mode);

      const durationMs = 900;
      const startedAt = performance.now();

      const step = (now: number) => {
        if (isStoppedRef.current) {
          dispatchSimulatedDragEvent(canvas, 'up', bounds.left + endX, bounds.top + touchY, mode);
          setIsPressed(false);
          resolve();
          return;
        }

        const linear = Math.min((now - startedAt) / durationMs, 1);
        const eased = 0.5 - (Math.cos(Math.PI * linear) / 2);
        const currentX = startX + ((endX - startX) * eased);

        setCursorPoint({ x: currentX, y: touchY });
        dispatchSimulatedDragEvent(canvas, 'move', bounds.left + currentX, bounds.top + touchY, mode);

        if (linear < 1) {
          rafRef.current = window.requestAnimationFrame(step);
          return;
        }

        dispatchSimulatedDragEvent(canvas, 'up', bounds.left + endX, bounds.top + touchY, mode);
        setIsPressed(false);
        rafRef.current = null;
        resolve();
      };

      rafRef.current = window.requestAnimationFrame(step);
    });
  }, [stageRef]);

  const playHint = useCallback(async (canvas: HTMLCanvasElement) => {
    if (isStoppedRef.current) return;

    setIsVisible(true);

    const directions: DragDirection[] = ['right', 'left'];
    for (const direction of directions) {
      if (isStoppedRef.current) return;
      await playSingleDrag(canvas, direction);
      if (isStoppedRef.current) return;
      await wait(260);
    }

    if (isStoppedRef.current) return;

    fadeOutRef.current = window.setTimeout(() => {
      setIsVisible(false);
      fadeOutRef.current = null;
    }, 400);
  }, [playSingleDrag, wait]);

  useEffect(() => {
    if (!isEnabled) {
      stopHint();
      return undefined;
    }

    const stage = stageRef.current;
    if (!stage) return undefined;

    isStoppedRef.current = false;
    hasStartedRef.current = false;

    const startWhenCanvasReady = () => {
      if (hasStartedRef.current || isStoppedRef.current) return;

      const canvas = stage.querySelector(VIEWER_CANVAS_SELECTOR) as HTMLCanvasElement | null;
      if (!canvas) return;

      hasStartedRef.current = true;
      startDelayRef.current = window.setTimeout(() => {
        startDelayRef.current = null;
        if (isStoppedRef.current) return;
        void playHint(canvas);
      }, VIEWER_GESTURE_START_DELAY_MS);
    };

    startWhenCanvasReady();
    const observer = new MutationObserver(startWhenCanvasReady);
    observer.observe(stage, { childList: true, subtree: true });

    const dismissOnTrustedInteraction = (event: Event) => {
      if (!event.isTrusted) return;
      stopHint();
    };

    stage.addEventListener('pointerdown', dismissOnTrustedInteraction, { passive: true });
    stage.addEventListener('touchstart', dismissOnTrustedInteraction, { passive: true });
    stage.addEventListener('mousedown', dismissOnTrustedInteraction, { passive: true });
    stage.addEventListener('wheel', dismissOnTrustedInteraction, { passive: true });

    return () => {
      observer.disconnect();
      stage.removeEventListener('pointerdown', dismissOnTrustedInteraction);
      stage.removeEventListener('touchstart', dismissOnTrustedInteraction);
      stage.removeEventListener('mousedown', dismissOnTrustedInteraction);
      stage.removeEventListener('wheel', dismissOnTrustedInteraction);
      stopHint();
    };
  }, [isEnabled, playHint, stageRef, stopHint]);

  return (
    <ViewerGestureOverlay $visible={isVisible}>
      <ViewerGestureTouchPoint
        $pressed={isPressed}
        $mode={inputMode}
        style={{ left: `${cursorPoint.x}px`, top: `${cursorPoint.y}px` }}
      />
      <ViewerGesturePrompt>
        {inputMode === 'touch' ? 'Swipe to rotate' : 'Click and drag to rotate'}
      </ViewerGesturePrompt>
    </ViewerGestureOverlay>
  );
};

const App: FunctionComponent<{}> = () => {
    const viewerStageRef = useRef<HTMLDivElement>(null);
    const [isGestureHintEnabled, setIsGestureHintEnabled] = useState<boolean>(() => window.parent === window);

    useEffect(() => {
      if (window.parent === window) {
        setIsGestureHintEnabled(true);
        return undefined;
      }

      const onMessage = (event: MessageEvent) => {
        if (!trustedMessageOrigins.has(event.origin)) return;
        if (event?.data?.customMessageType !== CONFIGURATOR_START_MESSAGE_TYPE) return;
        setIsGestureHintEnabled(true);
      };

      window.addEventListener('message', onMessage);
      return () => {
        window.removeEventListener('message', onMessage);
      };
    }, []);

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
                <ViewerStage ref={viewerStageRef}>
                    <ZakekeViewer />
                    <ViewerGestureHint stageRef={viewerStageRef} isEnabled={isGestureHintEnabled} />
                </ViewerStage>
            </ViewerPanel>
        </Layout>
    </ZakekeProvider>;
}

export default App; 
