import React, { FunctionComponent, useEffect, useMemo, useRef, useState, useCallback, useLayoutEffect } from 'react';
// import styled from 'styled-components';
import { useZakeke } from 'zakeke-configurator-react';
import { LayoutWrapper, ContentWrapper, Container,  OptionListItem, NavButton, LoadingSpinner, NotesWrapper, CartBar, StepNav, OptionsWrap, OptionText, OptionTitle, OptionDescription, ClosureSections, SectionTitle, SwatchGrid, SwatchButton, SwatchNoneLabel, ActionsCenter, LabelDesignWrap, LabelTabs, LabelTabButton, LabelForm, LabelDetails, LabelSummary, LabelSummaryMeta, LabelRow, LabelRowTight, LabelField, LabelInput, LabelTextarea, LabelDescription, LabelHelperText, FileNameRow, FileRemoveButton, LabelCheckboxRow, WizardWrap, WizardStepTitle, WizardOptions, WizardOptionButton, WizardNav, WizardHeader, WizardHeaderSide, RestartButton, PromptLoading, PromptSpinner, PromptFadeText, ConfigWarning, ViewportSpacer, GuidedActionRow, LabelPreviewImage, LabelPreviewReveal } from './list';
// import { List, StepListItem, , ListItemImage } from './list';
import { optionNotes } from '../data/option-notes';
import ClipLoader from 'react-spinners/ClipLoader';
import { useOrderStore } from '../state/orderStore';
import { WOOD_SWATCHES, WAX_SWATCHES } from '../data/options';  
import { resolveParentMessagingConfig } from '../utils/postMessage';



type AppMode = 'full' | 'lite';

const normalizebottleName = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');

const toBottleCameraKey = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, '_');

const buildSyntheticBottle = (bottleName: string) => {
  const cleaned = normalizebottleName(bottleName || 'antica');
  if (!cleaned) return null;
  let hash = 0;
  for (let i = 0; i < cleaned.length; i += 1) {
    hash = ((hash << 5) - hash) + cleaned.charCodeAt(i);
    hash |= 0;
  }
  const id = -Math.abs(hash || 1);
  const name = cleaned.replace(/(^|_)([a-z])/g, (_, __, c) => c.toUpperCase()).replace(/_/g, ' ');
  return { id, guid: `synthetic-${cleaned}`, name, selected: true };
};

const { parentTargetOrigin, trustedOrigins: trustedMessageOrigins } = resolveParentMessagingConfig();

const postToParent = (payload: unknown): void => {
  try {
    window.parent?.postMessage(payload, parentTargetOrigin);
  } catch (error) {
    console.error('postMessage failed', error);
  }
};

const resolveSessionId = (): string =>
  sessionStorage.getItem('ss_session_id') ||
  (window as any).SS?.getSessionId?.() ||
  String(Date.now());

const Selector: FunctionComponent<{ mode?: AppMode; defaultBottleName?: string }> = ({
  mode = 'full',
  defaultBottleName = 'antica',
}) => {
    const {
        isSceneLoading,
        isAddToCartLoading,
        price,
        groups,
        selectOption,
        addToCart,
        setCamera,
        setCameraByName,
        product,
        items,
        getMeshIDbyName,
        createImageFromUrl, 
        addItemImage,
        removeItem,
        // templates,
        // setTemplate,
        // setMeshDesignVisibility,
        // restoreMeshVisibility,
    } = useZakeke();


    // console.log("groups", groups)
    // console.log("product", product)
    // console.log("items", items)
    // console.log("price", price)
    // console.log("isSceneLoading", isSceneLoading)
    

    const isLiteMode = mode === 'lite';

    const buildGroup =
      groups.find(g => g.name === "Build Your Bottle") ??
      groups.find(g => Array.isArray(g?.steps) && g.steps.length > 0) ??
      null;

    const steps = useMemo(() => buildGroup?.steps ?? [], [buildGroup]);

  
    const findStepIndex = (needle: string, fallbackIndex: number) => {
      const i = steps.findIndex(s => s.name?.toLowerCase().includes(needle));
      return i >= 0 ? i : fallbackIndex;
    };

    const bottleStepIdx = isLiteMode ? -1 : findStepIndex('bottle', 0);
    const liquidStepIdx = findStepIndex('gin', isLiteMode ? 0 : 1);
    const closureStepIdx = findStepIndex('closure', isLiteMode ? 1 : 2);
    const labelStepIdx  = findStepIndex('label', isLiteMode ? 2 : 3);

    const bottleOptions = bottleStepIdx >= 0 ? (steps[bottleStepIdx]?.attributes?.[0]?.options ?? []) : [];
    const bottleIdx = bottleOptions.findIndex(o => o.selected);
    const bottleSel = bottleIdx >= 0 ? bottleOptions[bottleIdx] : null;
    // console.log("bottleSel", bottleSel);

    const pick = (stepIdx: number) => {
      const step = steps[stepIdx];
      if (!step) return null;

      const attrs: any[] = Array.isArray(step.attributes) ? step.attributes : [];
      const stepName = (step.name || '').toLowerCase();
      const isLabelStepLocal = stepName.includes('label') || stepName.includes('design');

      // --- Label/Design step: SINGLE attribute shared across bottles ---
      if (isLabelStepLocal) {
        // 1) any selected option across attributes
        for (const a of attrs) {
          const sel = (Array.isArray(a?.options) ? a.options : []).find((o: any) => !!o?.selected);
          if (sel) return sel;
        }
        // 2) explicit "No Selection"
        for (const a of attrs) {
          const noSel = (Array.isArray(a?.options) ? a.options : []).find((o: any) => (o?.name || '').trim().toLowerCase() === 'no selection');
          if (noSel) return noSel;
        }
        // 3) fallback to first enabled attribute's first option (or first available)
        const firstEnabledAttr = attrs.find(a => !!a?.enabled) || attrs[0] || null;
        const firstOpt = (Array.isArray(firstEnabledAttr?.options) ? firstEnabledAttr.options : [])[0] || null;
        return firstOpt || null;
      }

      // --- Closure step: prefer enabled attribute, else bottle-index attr, else first ---
      if (stepIdx === closureStepIdx) {
        const attr = attrs.find(a => !!a?.enabled) || (bottleIdx >= 0 ? attrs[bottleIdx] : null) || attrs[0] || null;
        const opts: any[] = Array.isArray(attr?.options) ? attr!.options : [];
        return opts.find(o => o?.selected) || null;
      }

      // --- Default (Bottle/Liquid/etc): bottle-index mapping with safety net ---
      const attrByBottleIndex = (typeof bottleIdx === 'number' && bottleIdx >= 0) ? attrs[bottleIdx] : undefined;
      const selectedViaIndex = Array.isArray(attrByBottleIndex?.options)
        ? attrByBottleIndex.options.find((o: any) => !!o?.selected) || null
        : null;
      if (selectedViaIndex) return selectedViaIndex;

      // Safety net: any selected across attributes
      for (const a of attrs) {
        const sel = (Array.isArray(a?.options) ? a.options : []).find((o: any) => !!o?.selected);
        if (sel) return sel;
      }

      return null;
    };

    const liquidSel  = pick(liquidStepIdx);
    const closureSel = pick(closureStepIdx);
    const labelSel   = pick(labelStepIdx);

    // console.log("liquidSel", liquidSel);
    // console.log("closureSel", closureSel);
    // console.log("labelSel", labelSel);

    // Notify parent once when the configurator finishes first render/load
    const seenTrue   = useRef(false);
    const prev       = useRef(isSceneLoading);
    const postedOnce = useRef(false); // per-mount guard

    // optional (prevents double post in React 18 StrictMode dev)
    let modulePosted = false; // module-scope (file-level), not on window

    useEffect(() => {
      // record if we've *ever* seen true
      if (isSceneLoading === true) seenTrue.current = true;

      // detect first falling edge: true -> false
      const becameFalse = prev.current === true && isSceneLoading === false;

      if (
        becameFalse &&
        seenTrue.current &&
        !postedOnce.current &&
        !modulePosted
      ) {
        postedOnce.current = true;
        modulePosted = true; // avoid double post across dev remounts

        postToParent({ customMessageType: 'firstRender', message: { closeLoadingScreen: true } });
      }

      prev.current = isSceneLoading;
    }, [isSceneLoading]);

    // --- UI navigation state (must be declared before effects that depend on them) ---
    const [selectedGroupId, selectGroup] = useState<number | null>(null);
    const [selectedStepId, selectStep] = useState<number | null>(null);
    const [selectedAttributeId, selectAttribute] = useState<number | null>(null);

    const [isSelecting, setIsSelecting] = useState(false);
    const selectGuardTimerRef = useRef<number | null>(null);
    const [isInitialUiReady, setIsInitialUiReady] = useState(false);
    const [labelMode, setLabelMode] = useState<'form' | 'guided' | 'upload'>('form');

    useEffect(() => {
      if (!isLiteMode) return;
      if (!steps.length) return;
      const bottleStep = steps[bottleStepIdx];
      const attrs: any[] = Array.isArray(bottleStep?.attributes) ? bottleStep!.attributes : [];
      const attr = attrs[0] || null;
      const opts: any[] = Array.isArray(attr?.options) ? attr!.options : [];
      if (!opts.length) return;
      if (opts.some(o => !!o?.selected)) return;

      const needle = normalizebottleName(defaultBottleName || 'antica');
      const match = opts.find((o: any) => {
        const name = normalizebottleName(o?.name || '');
        const code = normalizebottleName(o?.code || '');
        return (needle && (name.includes(needle) || code.includes(needle)));
      }) || opts[0];

      if (!match) return;

      if (selectedGroupId == null && buildGroup) {
        selectGroup(buildGroup.id);
      }
      if (selectedStepId !== bottleStep?.id && bottleStep?.id != null) {
        selectStep(bottleStep.id);
      }
      if (selectedAttributeId !== attr?.id && attr?.id != null) {
        selectAttribute(attr.id);
      }
      selectOption(match.id);
    }, [
      isLiteMode,
      steps,
      bottleStepIdx,
      defaultBottleName,
      selectedGroupId,
      selectedStepId,
      selectedAttributeId,
      selectGroup,
      selectStep,
      selectAttribute,
      selectOption,
      buildGroup,
    ]);

    type LabelFormState = {
      title: string;
      prompt: string;
      primaryColor: string;
      secondaryColor: string;
      characterFile: File | null;
      logoFile: File | null;
      hasCharacterPermission: boolean;
    };

    const [labelForm, setLabelForm] = useState<LabelFormState>({
      title: '',
      prompt: '',
      primaryColor: '',
      secondaryColor: '',
      characterFile: null,
      logoFile: null,
      hasCharacterPermission: false,
    });
    const [uploadLabelFile, setUploadLabelFile] = useState<File | null>(null);

    type LabelWizardState = {
      outputGoal: string;
      theme: string;
      themeOther: string;
      subTheme: string;
      settingType: string;
      settingSpecific: string;
      backgroundDepth: string;
      compositionLayout: string;
      framing: string;
      mainSubjectType: string;
      mainSubjectTypeOther: string;
      mainSubject: string;
      mainSubjectOther: string;
      mainStyling: string[];
      supportingCount: string;
      supportingType: string;
      action: string;
      actionOther: string;
      energy: string;
      styleFamily: string;
      styleFamilyOther: string;
      styleSubtype: string;
      texture: string;
      lighting: string;
      paletteMode: string;
      paletteVibe: string;
      paletteVibeOther: string;
      accentCount: string;
      accents: string[];
      labelTextSpace: string;
      complexity: string;
    };

    const [wizardStepIndex, setWizardStepIndex] = useState(0);
    const [wizardStarted, setWizardStarted] = useState(false);
    const [guidedPromptConfirmed, setGuidedPromptConfirmed] = useState(false);
    const [guidedGenerating, setGuidedGenerating] = useState(false);
    const [guidedEditMode, setGuidedEditMode] = useState(false);
    const [guidedEditNotes, setGuidedEditNotes] = useState('');
    const [reviewImagesVisible, setReviewImagesVisible] = useState(false);
    const [isPromptGenerating, setIsPromptGenerating] = useState(false);
    const [promptError, setPromptError] = useState(false);
    const [labelError, setLabelError] = useState(false);
    const [promptLoadingIndex, setPromptLoadingIndex] = useState(0);
    const [labelLoadingIndex, setLabelLoadingIndex] = useState(0);
    const [labelRequestKind, setLabelRequestKind] = useState<'create' | 'edit' | 'uploadLater' | null>(null);
    const [activeDesignSide, setActiveDesignSide] = useState<'front' | 'back'>('front');
    const [loadedLabelPreviewUrl, setLoadedLabelPreviewUrl] = useState('');
    const [showLoadedLabelPreview, setShowLoadedLabelPreview] = useState(false);
    const [hideLabelTabs, setHideLabelTabs] = useState(false);
    const [promptOverride, setPromptOverride] = useState('');
    const [labelWizard, setLabelWizard] = useState<LabelWizardState>({
      outputGoal: '',
      theme: '',
      themeOther: '',
      subTheme: '',
      settingType: '',
      settingSpecific: '',
      backgroundDepth: '',
      compositionLayout: '',
      framing: '',
      mainSubjectType: '',
      mainSubjectTypeOther: '',
      mainSubject: '',
      mainSubjectOther: '',
      mainStyling: [],
      supportingCount: '',
      supportingType: '',
      action: '',
      actionOther: '',
      energy: '',
      styleFamily: '',
      styleFamilyOther: '',
      styleSubtype: '',
      texture: '',
      lighting: '',
      paletteMode: '',
      paletteVibe: '',
      paletteVibeOther: '',
      accentCount: '',
      accents: [],
      labelTextSpace: '',
      complexity: '',
    });

    useEffect(() => {
      if (!labelForm.title.trim()) {
        setWizardStarted(false);
        setWizardStepIndex(0);
        setGuidedPromptConfirmed(false);
        setGuidedGenerating(false);
        setReviewImagesVisible(false);
        setHideLabelTabs(false);
      }
    }, [labelForm.title]);

    const selectedGroup = groups.find(group => group.id === selectedGroupId);
    const selectedStep = selectedGroup?.steps.find(step => step.id === selectedStepId) ?? null;

    // Ensure the single label attribute follows the selected bottle
    // BUT only when we are on the Label/Design step. Otherwise keep labels hidden via "No Selection".
    useEffect(() => {
      const step = steps[labelStepIdx];
      if (!step) return;

      const attrs: any[] = Array.isArray(step.attributes) ? step.attributes : [];
      const attr = attrs[0] || null; // single attribute holding all label options
      if (!attr) return;

      const opts: any[] = Array.isArray((attr as any).options) ? (attr as any).options : [];
      if (!opts.length) return;

      const noSel = opts.find(o => (o?.name || '').trim().toLowerCase() === 'no selection') || null;
      const active = opts.find(o => !!o?.selected) || null;

      const isLabelStep = /label|design/i.test(selectedStep?.name || '');

      // If we're NOT on the label step, force "No Selection" so labels stay hidden
      if (!isLabelStep) {
        if (noSel && active?.id !== noSel.id) {
          selectOption(noSel.id);
        }
        return;
      }

      // We ARE on the label step → map bottle -> specific label option by code suffix
      // In lite mode there is no bottle step selection, so map labels from default bottle name.
      const bottleName = (
        isLiteMode
          ? (defaultBottleName || '')
          : (bottleSel?.name || '')
      ).trim().toLowerCase();
      const bottleKey = bottleName.replace(/\s+/g, '_'); // e.g. 'Polo' -> 'polo'

      if (!bottleKey) {
        if (noSel && active?.id !== noSel.id) selectOption(noSel.id);
        return;
      }

      const match = opts.find(o => typeof o?.code === 'string' && o.code.toLowerCase().endsWith(`_${bottleKey}`));

      if (match && active?.id !== match.id) {
        selectOption(match.id);
        return;
      }

      if (!match && noSel && active?.id !== noSel.id) {
        selectOption(noSel.id);
      }
    }, [steps, labelStepIdx, selectedStepId, selectedStep?.name, bottleSel?.name, isLiteMode, defaultBottleName, selectOption]);

    const toMini = (o: any) => (o ? ({ id: o.id, guid: o.guid, name: o.name, selected: !!o.selected }) : null);

    // Keep "No Selection" visible in minis
    const miniBottle  = isLiteMode ? buildSyntheticBottle(defaultBottleName) : toMini(bottleSel);
    const miniLiquid  = toMini(liquidSel);
    const miniClosure = toMini(closureSel);
    const miniLabel   = toMini(labelSel);

    // console.log("miniBottle", miniBottle);
    // console.log("miniLiquid", miniLiquid);
    // console.log("miniClosure", miniClosure);
    // console.log("miniLabel", miniLabel);

    const {
      setFromSelections,
      labelDesigns,
      setFromUploadDesign,
      setLabelDesign,
      closureChoices,
      setClosureWood,
      setClosureWax
    } = useOrderStore();


    const selections = useMemo(() => ({
      bottleSel,
      liquidSel,
      closureSel,
      labelSel,
      bottle: miniBottle,
      liquid: miniLiquid,
      closure: miniClosure,
      label: miniLabel,
      closureExtras: isLiteMode ? null : closureChoices,
    } as const), [
      bottleSel,
      liquidSel,
      closureSel,
      labelSel,
      miniBottle,
      miniLiquid,
      miniClosure,
      miniLabel,
      closureChoices,
    ]);

    // console.log("selections", selections)

    // Key that only changes when meaningful order fields change, closure id excluded to avoid transient updates during attribute switch
    const orderKey = [
      product?.sku ?? '',
      String(price ?? ''),
      selections.bottle?.id ?? 0,
      selections.liquid?.id ?? 0,
      /* closure id excluded to avoid transient updates during attribute switch */
      selections.label?.id ?? 0,
    ].join('|');

    // Debug: compact order log on every meaningful change
    useEffect(() => {
      console.log('order', {
        sku: product?.sku ?? null,
        price,
        bottle: miniBottle?.name || null,
        liquid: miniLiquid?.name || null,
        closure: miniClosure?.name || null,
        label: miniLabel?.name || null,
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderKey]);


    useEffect(() => {
      setFromSelections({
        selections,
        sku: product?.sku ?? null,
        price,
      });
    }, [orderKey]);

    const productObject = useMemo(() => {
      const bottleName = selections.bottleSel?.name?.toLowerCase() || '';
      const frontMeshId = bottleName ? getMeshIDbyName(`${bottleName}_label_front`) : null;
      const backMeshId  = bottleName ? getMeshIDbyName(`${bottleName}_label_back`)  : null;

      const valid = !!(
        miniBottle && miniLiquid && miniClosure &&
        miniLiquid.name !== 'No Selection' &&
        miniClosure.name !== 'No Selection'
      );

      return {
        sku: product?.sku ?? null,
        price,
        selections: {
          bottle: selections.bottle,
          liquid: selections.liquid,
          closure: selections.closure,
          label: selections.label,
          // carry VistaCreate design IDs for edit flow
          frontDesignId: (labelDesigns as any)?.front?.id ?? null,
          backDesignId:  (labelDesigns as any)?.back?.id  ?? null,
          closureExtras: selections.closureExtras,
        },
        mesh: { frontMeshId, backMeshId },
        valid,
      } as const;
    }, [price, product?.sku, selections, getMeshIDbyName, labelDesigns, miniBottle, miniClosure, miniLiquid]);

    const labelAreaIds = useMemo(() => {
      const areas = product?.areas ?? [];
      if (!areas.length) {
        return { front: null, back: null } as const;
      }

      const bottleNameRaw = String(
        (miniBottle?.name || selections.bottle?.name || '').trim().toLowerCase()
      );
      const bottleNameNormalized = bottleNameRaw.replace(/\s+/g, '_');
      const bottleTokens = Array.from(
        new Set([bottleNameRaw, bottleNameNormalized].filter(Boolean))
      );

      const exactFrontNames = bottleTokens.map((token) => `${token}_label_front`);
      const exactBackNames = bottleTokens.map((token) => `${token}_label_back`);

      const findExactAreaId = (expectedNames: string[]) => {
        if (!expectedNames.length) return null;
        const wanted = new Set(expectedNames.map((name) => name.toLowerCase()));
        const area = areas.find((entry) =>
          wanted.has(String(entry?.name || '').toLowerCase())
        );
        return area?.id ?? null;
      };

      const frontExact = findExactAreaId(exactFrontNames);
      const backExact = findExactAreaId(exactBackNames);
      if (frontExact || backExact) {
        return { front: frontExact, back: backExact } as const;
      }

      // Fallback for legacy area naming that does not include bottle token.
      const frontFallback =
        areas.find((entry) => {
          const name = String(entry?.name || '').toLowerCase();
          return name.includes('label') && name.includes('front');
        })?.id ?? null;
      const backFallback =
        areas.find((entry) => {
          const name = String(entry?.name || '').toLowerCase();
          return name.includes('label') && name.includes('back');
        })?.id ?? null;

      return { front: frontFallback, back: backFallback } as const;
    }, [product?.areas, miniBottle?.name, selections.bottle?.name]);

    const promptLoadingMessages = useMemo(() => ([
      'Translating your choices into a creative brief…',
      'Shaping tone, mood and composition…',
      'Refining the visual language…',
      'Crafting the perfect prompt…',
      'Almost ready…',
    ]), []);

    const labelLoadingMessages = useMemo(() => ([
      'Blending visual ingredients…',
      'Distilling the composition…',
      'Infusing colour and texture…',
      'Ageing to perfection…',
      'Bottling the final design…',
      'Almost ready…',
    ]), []);

    const labelEditLoadingMessages = useMemo(() => ([
      'Rebalancing the blend…',
      'Adjusting notes and finish…',
      'Deepening colour and character…',
      'Smoothing the final edges…',
      'Resealing the bottle…',
    ]), []);

    const liveItems = useMemo(
      () => (Array.isArray(items) ? items : []).filter((it: any) => !it?.deleted),
      [items]
    );

    const hasLabelOnBottle = useMemo(() => {
      if (!liveItems.length) return false;
      const frontId = labelAreaIds.front;
      const backId = labelAreaIds.back;
      if (frontId || backId) {
        return liveItems.some((it: any) => (
          it?.areaId === frontId ||
          it?.areaId === backId ||
          it?.area?.id === frontId ||
          it?.area?.id === backId
        ));
      }
      return liveItems.length > 0;
    }, [liveItems, labelAreaIds.front, labelAreaIds.back]);

    const labelPreviewUrl = useMemo(() => {
      const front = (labelDesigns as any)?.front || null;
      if (!front) return '';
      return (
        front.frontS3Url ||
        front.s3url ||
        front.url ||
        (Array.isArray(front.images) ? front.images[0] : '') ||
        ''
      );
    }, [labelDesigns]);

    useEffect(() => {
      if (!labelPreviewUrl) {
        setLoadedLabelPreviewUrl('');
        setShowLoadedLabelPreview(false);
        return;
      }

      let cancelled = false;
      const preload = new Image();
      preload.onload = () => {
        if (cancelled) return;
        setLoadedLabelPreviewUrl(labelPreviewUrl);
        setShowLoadedLabelPreview(false);
        requestAnimationFrame(() => {
          if (!cancelled) setShowLoadedLabelPreview(true);
        });
      };
      preload.onerror = () => {
        if (cancelled) return;
        setShowLoadedLabelPreview(false);
      };
      preload.src = labelPreviewUrl;

      return () => {
        cancelled = true;
      };
    }, [labelPreviewUrl]);

    const isCurrentLabelPreviewLoaded = Boolean(labelPreviewUrl) && loadedLabelPreviewUrl === labelPreviewUrl;

    useEffect(() => {
      if (guidedGenerating && hasLabelOnBottle && labelRequestKind !== 'edit') {
        setGuidedGenerating(false);
      }
    }, [guidedGenerating, hasLabelOnBottle, labelRequestKind]);

    useEffect(() => {
      if (hasLabelOnBottle && labelError) {
        setLabelError(false);
      }
    }, [hasLabelOnBottle, labelError]);

    useEffect(() => {
      if (hasLabelOnBottle && (labelRequestKind === 'create' || labelRequestKind === 'uploadLater') && !guidedGenerating) {
        setLabelRequestKind(null);
      }
    }, [hasLabelOnBottle, labelRequestKind, guidedGenerating]);

    useEffect(() => {
      if (!isPromptGenerating) return;
      setPromptLoadingIndex(0);
      const max = promptLoadingMessages.length - 1;
      const id = window.setInterval(() => {
        setPromptLoadingIndex((prev) => (prev >= max ? max : prev + 1));
      }, 3500);
      return () => window.clearInterval(id);
    }, [isPromptGenerating, promptLoadingMessages.length]);

    useEffect(() => {
      if (!guidedGenerating) return;
      setLabelLoadingIndex(0);
      const messages = labelRequestKind === 'edit' ? labelEditLoadingMessages : labelLoadingMessages;
      const max = messages.length - 1;
      const id = window.setInterval(() => {
        setLabelLoadingIndex((prev) => (prev >= max ? max : prev + 1));
      }, 3500);
      return () => window.clearInterval(id);
    }, [guidedGenerating, labelLoadingMessages.length, labelEditLoadingMessages.length, labelRequestKind]);

    useEffect(() => {
      if (!guidedGenerating) return;
      if (labelRequestKind !== 'edit' && hasLabelOnBottle) return;
      const timeout = window.setTimeout(() => {
        setGuidedGenerating(false);
        setLabelError(true);
      }, 90000);
      return () => window.clearTimeout(timeout);
    }, [guidedGenerating, hasLabelOnBottle, labelRequestKind]);

    useEffect(() => {
      if (!isPromptGenerating) return;
      const timeout = window.setTimeout(() => {
        setIsPromptGenerating(false);
        setPromptError(true);
      }, 45000);
      return () => window.clearTimeout(timeout);
    }, [isPromptGenerating]);

    useEffect(() => {
      if (labelMode === 'upload' && guidedEditMode) {
        setGuidedEditMode(false);
        setGuidedEditNotes('');
      }
    }, [labelMode, guidedEditMode]);

    // Invisible warning helper (logs and stores a message for later UX surfacing)
    const setWarning = (msg: string) => {
      const el = document.getElementById('config-warning');
      if (el) {
        el.textContent = msg;
        el.setAttribute('data-warning', 'true');
      }
      console.warn('[Configurator warning]', msg);
    };

    const requireBottle = !isLiteMode;
    const hasSelectionInStep = (stepIdx: number) => {
      const step = steps[stepIdx];
      const attrs: any[] = Array.isArray(step?.attributes) ? step!.attributes : [];
      for (const a of attrs) {
        const opts: any[] = Array.isArray(a?.options) ? a.options : [];
        const sel = opts.find(o => !!o?.selected);
        if (sel && (sel.name || '').trim().toLowerCase() !== 'no selection') return true;
      }
      return false;
    };

    const hasBottleSelection = hasSelectionInStep(bottleStepIdx);
    const hasLiquidSelection = hasSelectionInStep(liquidStepIdx);
    const hasClosureSelection = hasSelectionInStep(closureStepIdx);

    const canDesign = hasLiquidSelection && hasClosureSelection && (!requireBottle || hasBottleSelection);
    const isAiLabelMode = labelMode === 'guided' || labelMode === 'form';
    const hasUploadLaterTemplateOnBottle = Boolean((labelDesigns as any)?.front?.uploadLaterTemplate);
    const isUploadLaterRequest = labelMode === 'upload' && guidedGenerating && labelRequestKind === 'uploadLater';
    const showLabelLoadingState =
      guidedGenerating &&
      (
        (isAiLabelMode && (labelRequestKind === 'edit' || !hasLabelOnBottle)) ||
        isUploadLaterRequest
      );
    const showUploadLabelForm = labelMode === 'upload' && !isUploadLaterRequest && !hasUploadLaterTemplateOnBottle;
    const showLabelErrorState = (isAiLabelMode || labelMode === 'upload') && labelError && !guidedGenerating;
    const showPromptFormBuilder =
      labelMode === 'form' && !guidedGenerating && !hasLabelOnBottle && !guidedEditMode && !labelError;



    // Initialize group/step/attribute once groups are available
    useEffect(() => {
      if (!groups || groups.length === 0) return;
      if (selectedGroupId !== null && selectedStepId !== null && selectedAttributeId !== null) return;

      const bottleGroup = groups.find(g => g.name === 'Build Your Bottle') || groups[0];
      selectGroup((prev: number | null) => (prev === null ? bottleGroup.id : prev));

      const firstStep = bottleGroup.steps?.[0] || null;
      if (firstStep) {
        selectStep((prev: number | null) => (prev === null ? firstStep.id : prev));
      }

      const attrs = (firstStep || bottleGroup)?.attributes || [];
      const firstEnabledAttr = attrs.find(a => a.enabled) || attrs[0];
      if (firstEnabledAttr) {
        selectAttribute((prev: number | null) => (prev === null ? firstEnabledAttr.id : prev));
      }
    }, [groups, selectedGroupId, selectedStepId, selectedAttributeId]);

    useEffect(() => {
      if (isInitialUiReady) return;
      if (!groups || groups.length === 0) return;
      if (isSceneLoading) return;
      setIsInitialUiReady(true);
    }, [groups, isSceneLoading, isInitialUiReady]);


    // (Optional debug) Log selected group/step
    // console.log('UI selectedGroupId', selectedGroupId, '->', selectedGroup?.name);
    // console.log('UI selectedStepId', selectedStepId, '->', selectedStep?.name);

    const attributes = useMemo(() => (selectedStep || selectedGroup)?.attributes ?? [], [selectedGroup, selectedStep]);
    const selectedAttribute = attributes.find(attribute => attribute.id === selectedAttributeId);

    // When step changes, ensure an attribute is selected
    useEffect(() => {
      if (!selectedStep && !selectedGroup) return;
      const attrs = (selectedStep || selectedGroup)?.attributes || [];
      if (!attrs.length) return;
      const firstEnabledAttr = attrs.find(a => a.enabled) || attrs[0];
      if (firstEnabledAttr && selectedAttributeId == null) {
        selectAttribute(firstEnabledAttr.id);
      }
    }, [selectedStep, selectedGroup, selectedAttributeId, attributes]);


    useEffect(() => {
      const { mesh } = productObject;
      // console.log('frontMeshId', mesh.frontMeshId);
      // console.log('backMeshId', mesh.backMeshId);
    }, [productObject]);


    useEffect(() => {
      const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

      const findOptionId = (stepNeedle: string, optionName: string) => {
        const needle = String(stepNeedle || '').trim().toLowerCase();
        const target = String(optionName || '').trim().toLowerCase();
        if (!needle || !target) return null;
        const step = steps.find((item: any) => String(item?.name || '').toLowerCase().includes(needle));
        if (!step) return null;
        const attrs: any[] = Array.isArray(step?.attributes) ? step.attributes : [];
        for (const attr of attrs) {
          const options: any[] = Array.isArray(attr?.options) ? attr.options : [];
          const exact = options.find((option) => String(option?.name || '').trim().toLowerCase() === target);
          if (exact) return exact.id;
          const partial = options.find((option) => String(option?.name || '').trim().toLowerCase().includes(target));
          if (partial) return partial.id;
        }
        return null;
      };

      const applyBootstrapSelections = async (payload: any) => {
        const bottleId = findOptionId('bottle', payload?.bottleName || '');
        if (bottleId) {
          selectOption(bottleId);
          await wait(180);
        }
        const liquidId =
          findOptionId('liquid', payload?.liquidName || '') ||
          findOptionId('gin', payload?.liquidName || '');
        if (liquidId) {
          selectOption(liquidId);
          await wait(180);
        }
        const closureId = findOptionId('closure', payload?.closureName || '');
        if (closureId) {
          selectOption(closureId);
          await wait(180);
        }
      };

      const ensureLabelOptionVisible = async () => {
        const labelStep = steps[labelStepIdx];
        if (!labelStep) return;
        const attrs: any[] = Array.isArray(labelStep?.attributes) ? labelStep.attributes : [];
        const attr = attrs[0] || null;
        if (!attr) return;
        const opts: any[] = Array.isArray(attr?.options) ? attr.options : [];
        if (!opts.length) return;

        const active = opts.find((o: any) => !!o?.selected) || null;
        const bottleName = (
          isLiteMode
            ? (defaultBottleName || '')
            : (bottleSel?.name || '')
        ).trim().toLowerCase();
        const bottleKey = bottleName.replace(/\s+/g, '_');
        if (!bottleKey) return;

        const match = opts.find((o: any) =>
          typeof o?.code === 'string' && o.code.toLowerCase().endsWith(`_${bottleKey}`)
        );
        if (match && active?.id !== match.id) {
          selectOption(match.id);
          // Allow scene actions (show/hide meshes) to settle before adding design items.
          await wait(220);
        }
      };

      const resolveVersionKind = (designExport: any): 'Initial' | 'Edit' | 'Upload' => {
        if (labelRequestKind === 'edit') return 'Edit';
        if (
          labelMode === 'upload' ||
          designExport?.source === 'custom-upload' ||
          designExport?.uploadLaterTemplate
        ) {
          return 'Upload';
        }
        return 'Initial';
      };

      const firstHttp = (...values: Array<unknown>): string | null => {
        for (const value of values) {
          if (typeof value !== 'string') continue;
          const text = value.trim();
          if (/^https?:\/\//i.test(text)) return text;
        }
        return null;
      };

      const firstImageRef = (...values: Array<unknown>): string | null => {
        for (const value of values) {
          if (typeof value !== 'string') continue;
          const text = value.trim();
          if (!text) continue;
          if (/^https?:\/\//i.test(text)) return text;
          if (/^data:image\//i.test(text)) return text;
        }
        return null;
      };

      const compactDesignExport = (designExport: any, side: 'front' | 'back') => {
        const s3Url = firstHttp(
          designExport?.outputS3Url,
          side === 'front' ? designExport?.frontS3Url : designExport?.backS3Url,
          designExport?.s3url,
          designExport?.url,
          Array.isArray(designExport?.s3Uploads) ? designExport.s3Uploads[0]?.url : null
        );
        const imageRef = firstImageRef(
          s3Url,
          side === 'front' ? designExport?.frontImage : designExport?.backImage,
          designExport?.imageDataUrl,
          Array.isArray(designExport?.images) ? designExport.images[0] : null,
          Array.isArray(designExport?.imageUrls) ? designExport.imageUrls[0] : null
        );

        return {
          ...designExport,
          s3url: s3Url || designExport?.s3url || '',
          url: s3Url || designExport?.url || '',
          frontS3Url: side === 'front' ? (s3Url || designExport?.frontS3Url || '') : (designExport?.frontS3Url || ''),
          backS3Url: side === 'back' ? (s3Url || designExport?.backS3Url || '') : (designExport?.backS3Url || ''),
          frontImage: side === 'front'
            ? (imageRef || designExport?.frontImage || '')
            : (designExport?.frontImage || ''),
          backImage: side === 'back'
            ? (imageRef || designExport?.backImage || '')
            : (designExport?.backImage || ''),
          images: imageRef ? [imageRef] : [],
          imageUrls: s3Url ? [s3Url] : (Array.isArray(designExport?.imageUrls) ? designExport.imageUrls : []),
          imageDataUrl: imageRef && /^data:image\//i.test(imageRef) ? imageRef : ''
        };
      };

      const buildLabelPersistence = (side: 'front' | 'back', designExport: any) => {
        const aiInput =
          (designExport?.aiInput && typeof designExport.aiInput === 'object')
            ? designExport.aiInput
            : {};

        const outputImageUrl = firstHttp(
          designExport?.outputImageUrl,
          designExport?.frontImage,
          designExport?.backImage,
          designExport?.url,
          designExport?.s3url,
          Array.isArray(designExport?.imageUrls) ? designExport.imageUrls[0] : null
        );
        const outputS3Url = firstHttp(
          designExport?.outputS3Url,
          designExport?.frontS3Url,
          designExport?.backS3Url,
          designExport?.s3url,
          designExport?.url
        );
        const outputPdfUrl = firstHttp(designExport?.outputPdfUrl, designExport?.pdfUrl);
        const outputZakekeUrl = firstHttp(designExport?.outputZakekeUrl, designExport?.zakekeUrl);
        const inputLogoUrl = firstHttp(
          designExport?.inputLogoUrl,
          aiInput?.inputLogoUrl,
          aiInput?.logoUrl
        );
        const inputCharacterUrl = firstHttp(
          designExport?.inputCharacterUrl,
          aiInput?.inputCharacterUrl,
          aiInput?.characterUrl
        );
        const inputReferenceUrl = firstHttp(
          designExport?.inputReferenceUrl,
          designExport?.previousImage,
          aiInput?.inputReferenceUrl
        );
        const promptText =
          String(
            aiInput?.prompt ||
            designExport?.prompt ||
            promptOverride ||
            labelForm.prompt ||
            ''
          ).trim() || null;
        const editPromptText =
          String(
            designExport?.editPromptText ||
            designExport?.critique ||
            guidedEditNotes ||
            ''
          ).trim() || null;

        return {
          sessionId: resolveSessionId(),
          versionKind: resolveVersionKind(designExport),
          accepted: true,
          displayName:
            String(
              aiInput?.title ||
              designExport?.displayName ||
              designExport?.title ||
              labelForm.title ||
              ''
            ).trim() || null,
          promptText,
          editPromptText,
          inputLogoUrl,
          inputCharacterUrl,
          inputReferenceUrl,
          outputImageUrl,
          outputS3Url,
          outputPdfUrl,
          outputZakekeUrl,
          outputS3Key: typeof designExport?.outputS3Key === 'string' ? designExport.outputS3Key : null,
          modelName:
            String(
              designExport?.modelName ||
              designExport?.model ||
              designExport?.model_name ||
              ''
            ).trim() || null,
          source: String(designExport?.source || '').trim() || 'zakeke'
        };
      };

      const onMsg = async (e: MessageEvent) => {
        if (!trustedMessageOrigins.has(e.origin)) {
          console.warn('[postMessage] Ignored untrusted origin:', e.origin);
          return;
        }

        if (e.data?.customMessageType === 'studioEditBootstrap') {
          const payload = e.data?.message || {};
          await applyBootstrapSelections(payload);

          const parentOrder = {
            bottle: productObject.selections.bottle,
            liquid: productObject.selections.liquid,
            closure: productObject.selections.closure,
            label: productObject.selections.label,
          };

          const frontDesign = payload?.front?.designExport || null;
          const backDesign = payload?.back?.designExport || null;

          if (frontDesign) {
            window.postMessage(
              {
                customMessageType: 'uploadDesign',
                message: {
                  order: parentOrder,
                  designSide: 'front',
                  designExport: frontDesign,
                },
              },
              window.location.origin
            );
          }

          if (backDesign) {
            window.postMessage(
              {
                customMessageType: 'uploadDesign',
                message: {
                  order: parentOrder,
                  designSide: 'back',
                  designExport: backDesign,
                },
              },
              window.location.origin
            );
          }
          return;
        }

        if (e.data?.customMessageType === 'uploadDesign') {
          console.log("Received uploadDesign message:", e.data.message);
          
          const { designExport, designSide } = e.data.message || {};
          const resolvedSide: 'front' | 'back' = String(designSide).toLowerCase() === 'back' ? 'back' : 'front';
          const safeDesignExport = compactDesignExport(designExport || {}, resolvedSide);
          console.log("designExport", safeDesignExport)
          console.log("designSide", resolvedSide)
          const parentOrder = e.data.message?.order;
          if (designSide) {
            setActiveDesignSide(resolvedSide);
            // Persist to zustand so UI flips to "Edit [side] label" and save gating can use it
            setFromUploadDesign({
              order: parentOrder,
              designSide: resolvedSide,
              designExport: safeDesignExport,
            });
            
            const bottleName = productObject?.selections?.bottle?.name?.toLowerCase() ?? '';
            setCameraByName(`${bottleName}_full_front`)
          }

          // items.forEach(item => {
          //   const itemGuid = item.guid;
          //   removeItem(itemGuid)
          // })

          if (!designSide ) return;

          const bottleName = productObject?.selections?.bottle?.name?.toLowerCase() ?? '';
          const areaName = `${bottleName}_label_${resolvedSide}`;

          await ensureLabelOptionVisible();

          const area = product?.areas?.find(a => a.name === areaName);
          if (!area) {
            console.warn('No area found', { areaName });
            return;
          }

          if(resolvedSide === "front") {
            const frontSource = firstImageRef(
              safeDesignExport?.frontS3Url,
              safeDesignExport?.s3url,
              safeDesignExport?.url,
              safeDesignExport?.frontImage,
              Array.isArray(safeDesignExport?.images) ? safeDesignExport.images[0] : null
            );
            if (!frontSource) {
              console.warn('[uploadDesign] Missing front image source in designExport');
              return;
            }
            const frontImage = await createImageFromUrl(frontSource);
            // const frontImage = await createImageFromUrl("https://barrel-n-bond.s3.eu-west-2.amazonaws.com/public/Front+Label+for+the+Polo+Bottle+inc+Bleed.jpg");
            // const frontMeshId = getMeshIDbyName(`${productObject?.selections?.bottle?.name.toLowerCase()}_label_front`);
            // console.log("frontMeshId", frontMeshId);

            const frontAreaId = product?.areas.find(a => a.name === productObject?.selections?.bottle?.name.toLowerCase() + '_label_front')?.id;
            // console.log("frontAreaId", frontAreaId);
            
            if (frontImage?.imageID && frontAreaId) {
              const addedGuid = await addItemImage(frontImage.imageID, frontAreaId);
              if (!addedGuid) {
                console.warn('[uploadDesign] addItemImage returned no guid', {
                  designSide: resolvedSide,
                  imageId: frontImage.imageID,
                  areaId: frontAreaId
                });
                return;
              }
              // Treat a successful addItemImage as completion even if item-list sync lags.
              setGuidedGenerating(false);
              setLabelRequestKind(null);
              setLabelError(false);
              if (labelRequestKind === 'edit') {
                setGuidedEditMode(false);
                setGuidedEditNotes('');
              }
              const labelPersistence = buildLabelPersistence('front', safeDesignExport);

              console.log("postMessage Content:", {
                customMessageType: 'labelAdded',
                message: {
                  'order': {
                    'bottle': productObject.selections.bottle,
                    'liquid': productObject.selections.liquid,
                    'closure': productObject.selections.closure,
                    'label': productObject.selections.label,
                    'closureExtras': productObject.selections.closureExtras,
                  },
                  'designSide': resolvedSide,
                  'designExport': safeDesignExport,
                  'productSku': product?.sku ?? null,
                  ...labelPersistence,
                }
              });

              postToParent({
                customMessageType: 'labelAdded',
                message: {
                  'order': {
                    'bottle': productObject.selections.bottle,
                    'liquid': productObject.selections.liquid,
                    'closure': productObject.selections.closure,
                    'label': productObject.selections.label,
                    'closureExtras': productObject.selections.closureExtras,
                  },
                  'designSide': resolvedSide,
                  'designExport': safeDesignExport,
                  'productSku': product?.sku ?? null,
                  ...labelPersistence,
                }
              });

            }
          
          } else if(resolvedSide === "back") {
            const backSource = firstImageRef(
              safeDesignExport?.backS3Url,
              safeDesignExport?.s3url,
              safeDesignExport?.url,
              safeDesignExport?.backImage,
              Array.isArray(safeDesignExport?.images) ? safeDesignExport.images[0] : null
            );
            if (!backSource) {
              console.warn('[uploadDesign] Missing back image source in designExport');
              return;
            }
            const backImage = await createImageFromUrl(backSource);
            // const backImage = await createImageFromUrl("https://barrel-n-bond.s3.eu-west-2.amazonaws.com/public/Front+Label+for+the+Polo+Bottle+inc+Bleed.jpg");
  
            // const backMeshId = getMeshIDbyName(`${productObject?.selections?.bottle?.name.toLowerCase()}_label_back`);
            // console.log("backMeshId", backMeshId);
  
            const backAreaId = product?.areas.find(a => a.name === productObject?.selections?.bottle?.name.toLowerCase() + '_label_back')?.id;
  
            // console.log("backAreaId", backAreaId);
  
            if (backImage?.imageID && backAreaId) {
              const addedGuid = await addItemImage(backImage.imageID, backAreaId);
              if (!addedGuid) {
                console.warn('[uploadDesign] addItemImage returned no guid', {
                  designSide: resolvedSide,
                  imageId: backImage.imageID,
                  areaId: backAreaId
                });
                return;
              }
              // Treat a successful addItemImage as completion even if item-list sync lags.
              setGuidedGenerating(false);
              setLabelRequestKind(null);
              setLabelError(false);
              if (labelRequestKind === 'edit') {
                setGuidedEditMode(false);
                setGuidedEditNotes('');
              }
              const labelPersistence = buildLabelPersistence('back', safeDesignExport);

              console.log("postMessage Content:", {
                customMessageType: 'labelAdded',
                message: {
                  'order': {
                    'bottle': productObject.selections.bottle,
                    'liquid': productObject.selections.liquid,
                    'closure': productObject.selections.closure,
                    'label': productObject.selections.label,
                    'closureExtras': productObject.selections.closureExtras,
                  },
                  'designSide': resolvedSide,
                  'designExport': safeDesignExport,
                  'productSku': product?.sku ?? null,
                  ...labelPersistence,
                }
              });

              postToParent({
                customMessageType: 'labelAdded',
                message: {
                  'order': {
                    'bottle': productObject.selections.bottle,
                    'liquid': productObject.selections.liquid,
                    'closure': productObject.selections.closure,
                    'label': productObject.selections.label,
                    'closureExtras': productObject.selections.closureExtras,
                  },
                  'designSide': resolvedSide,
                  'designExport': safeDesignExport,
                  'productSku': product?.sku ?? null,
                  ...labelPersistence,
                }
              });

            }
          }
        }
        if (e.data?.customMessageType === 'generateLabelPromptResult') {
          const prompt = e.data?.message?.prompt || '';
          if (prompt) {
            setPromptOverride(prompt);
          }
          setPromptError(false);
          setIsPromptGenerating(false);
        }
        if (e.data?.customMessageType === 'generateLabelPromptError') {
          setPromptError(true);
          setIsPromptGenerating(false);
        }
        if (
          e.data?.customMessageType === 'generateLabelImageError' ||
          e.data?.customMessageType === 'generateLabelRevisionError' ||
          e.data?.customMessageType === 'generateLabelError'
        ) {
          setLabelError(true);
          setGuidedGenerating(false);
        }
      };
      window.addEventListener('message', onMsg);
      return () => window.removeEventListener('message', onMsg);
    }, [createImageFromUrl, getMeshIDbyName, addItemImage, removeItem, items, productObject?.selections?.bottle?.name, product?.areas, setCameraByName, setFromUploadDesign, steps, selectOption, productObject?.selections?.bottle, productObject?.selections?.liquid, productObject?.selections?.closure, productObject?.selections?.label, labelRequestKind, labelMode, labelForm.prompt, labelForm.title, promptOverride, guidedEditNotes, isLiteMode, defaultBottleName, bottleSel?.name, labelStepIdx]);


    // --- Clear items when bottle changes ---
    const prevBottleIdRef = useRef<number | null>(null);

    const clearAllItems = useCallback(async () => {
      if (typeof removeItem !== 'function') {
        console.warn('[Configurator] removeItem not available from useZakeke; cannot clear items on bottle change.');
        return;
      }
      const live = (Array.isArray(items) ? items : []).filter((it: any) => !it?.deleted);
      for (const it of live) {
        try {
          await removeItem(it.guid);
        } catch (err) {
          console.warn('[Configurator] Failed to remove item', it?.guid, err);
        }
      }
      console.log('[Configurator] Cleared', live.length, 'items after bottle change');
    }, [items, removeItem]);

    useEffect(() => {
      const currentBottleId = (bottleSel?.id ?? miniBottle?.id ?? null) as number | null;
      const prev = prevBottleIdRef.current;

      // Avoid clearing on first mount; only clear when actual bottle id changes
      if (prev !== null && currentBottleId !== null && currentBottleId !== prev) {
        clearAllItems(); // fire-and-forget
      }
      prevBottleIdRef.current = currentBottleId;
    }, [bottleSel?.id, miniBottle?.id, clearAllItems]);

    // Clear any previously attached label items on first entry to the Label/Design step
    const didClearOnLabelRef = useRef(false);
    useEffect(() => {
      const name = (selectedStep?.name || '').toLowerCase();
      const onLabelStepNow = name.includes('label') || name.includes('design');
      if (onLabelStepNow && !didClearOnLabelRef.current) {
        didClearOnLabelRef.current = true;
        clearAllItems();
      }
    }, [selectedStep?.id, clearAllItems]);



    useEffect(() => {
        if (!selectedAttribute && attributes.length > 0) {
            const firstEnabledAttribute = attributes.find(attr => attr.enabled);
            if (firstEnabledAttribute) {
                selectAttribute(firstEnabledAttribute.id);
            }
        }
    }, [selectedAttribute, attributes]);

    useEffect(() => {
        if (selectedGroup) {
            const camera = selectedGroup.cameraLocationId;
            if (camera) setCamera(camera);
        }
    }, [selectedGroupId, selectedGroup, setCamera]);

    // === Camera animation: refs & helpers (top-level inside component) ===
    const camAbort = useRef<AbortController | null>(null);
    const lastCamRef = useRef<string | null>(null);
    const isAnimatingCam = useRef(false);
    const prevTourKeyRef = useRef<string | null>(null);
    const pendingTourKeyRef = useRef<string | null>(null);
    const sceneLoadingRef = useRef(isSceneLoading);

    useEffect(() => {
      sceneLoadingRef.current = isSceneLoading;
    }, [isSceneLoading]);

    const waitSceneIdle = async (timeout = 1500, interval = 60) => {
      const start = Date.now();
      let stable = 0;
      while (Date.now() - start < timeout) {
        if (!sceneLoadingRef.current) {
          stable++;
          if (stable >= 2) break;
        } else {
          stable = 0;
        }
        await new Promise(r => setTimeout(r, interval));
      }
      await new Promise(r => requestAnimationFrame(() => r(null)));
    };

    const moveCamera = async (name: string, animate = true) => {
      try {
        await setCameraByName(name, false, animate);
        lastCamRef.current = name;
      } catch {
        const alt = name.includes('-')
          ? name.replace(/-/g, '_')
          : (name.includes('_') ? name.replace(/_/g, '-') : '');
        if (!alt || alt === name) return;
        try {
          await setCameraByName(alt, false, animate);
          lastCamRef.current = alt;
        } catch {}
      }
    };

    const runCameraTour = async (frames: string[], final: string, perFrameMs = 600) => {
      // prevent concurrent tours
      if (isAnimatingCam.current) return;
      isAnimatingCam.current = true;

      camAbort.current?.abort();
      const ctrl = new AbortController();
      camAbort.current = ctrl;

      try {
        // ensure visible motion if we're already on the final cam
        const seq = [...frames];
        if (lastCamRef.current && lastCamRef.current === final) {
          const alt = frames.find(f => f !== final);
          if (alt) seq.unshift(alt);
        }

        for (const f of seq) {
          if (ctrl.signal.aborted) return;
          await moveCamera(f);
          await waitSceneIdle(3600, 60);
          await new Promise(r => setTimeout(r, perFrameMs));
        }
        if (!ctrl.signal.aborted) {
          await moveCamera(final);
          await waitSceneIdle(3600, 60);
          await moveCamera(final, false);
        }
      } finally {
        if (camAbort.current === ctrl) camAbort.current = null;
        isAnimatingCam.current = false;
      }
    };

    // Fire tour on step / bottle change, but debounce identical requests
    useEffect(() => {
      if (!selectedStep) return;

      const stepName = (selectedStep.name || '').toLowerCase();
      const stepKey: 'bottle' | 'liquid' | 'closure' | 'label' =
        stepName.includes('bottle') ? 'bottle' :
        stepName.includes('liquid') || stepName.includes('gin') || stepName.includes('vodka') || stepName.includes('whiskey') || stepName.includes('rum')
          ? 'liquid'
          : stepName.includes('closure') ? 'closure' : 'label';

      const rawBottleName = (bottleSel?.name || selections.bottle?.name || '')
        .trim()
        .toLowerCase();
      const bottleKey = rawBottleName.replace(/\s+/g, '_');

      if (!bottleKey) return;

      const cams: Record<'full_front'|'full_side'|'closure'|'label_front'|'label_back', string> = {
        full_front: `${bottleKey}_full_front`,
        full_side: `${bottleKey}_full_side`,
        closure: `${bottleKey}_closure`,
        label_front: `${bottleKey}_label_front`,
        label_back: `${bottleKey}_label_back`,
      };

      let frames: string[] = [];
      let final: string = cams.full_front;

      if (stepKey === 'bottle') {
        frames = ['wide_high_back'];
        final = cams.full_front;
      } else if (stepKey === 'liquid') {
        frames = ['wide_low_front'];
        final = cams.full_front;
      } else if (stepKey === 'closure') {
        frames = ['wide_high_front', 'wide_high_back'];
        final = cams.closure;
      } else if (stepKey === 'label') {
        frames = ['wide_high_front'];
        final = cams.label_front
      }

      const tourKey = `${stepKey}|${bottleKey}|${final}`;
      if (pendingTourKeyRef.current === tourKey) return;
      if (prevTourKeyRef.current === tourKey) return;
      pendingTourKeyRef.current = tourKey;

      const perFrameMs = stepKey === 'bottle' ? 1000 : 1000;

      (async () => {
        await waitSceneIdle(4500, 60);
        if (pendingTourKeyRef.current !== tourKey) return;
        await runCameraTour(frames, final, perFrameMs);
        if (pendingTourKeyRef.current === tourKey) {
          prevTourKeyRef.current = tourKey;
          pendingTourKeyRef.current = null;
        }
      })();

      return () => {
        if (pendingTourKeyRef.current === tourKey) {
          pendingTourKeyRef.current = null;
        }
        camAbort.current?.abort();
      };
    }, [
      selectedStep?.id,
      selectedStep?.name,
      selections.bottle?.name,
      bottleSel?.name,
    ]);

    // --- Helper: find an option by exact name across ALL attributes in the current step ---
    const findOptionInStepByName = useMemo(() => {
      return (step: any, name: string): { attributeId: number | null; optionId: number | null } => {
        if (!step) return { attributeId: null, optionId: null };

        const needle = (name || '').trim().toLowerCase();
        const attrs: any[] = Array.isArray(step.attributes) ? step.attributes : [];

        // Search order: enabled attrs first, then the rest
        const orderedAttrs = [
          ...attrs.filter(a => !!a?.enabled),
          ...attrs.filter(a => !a?.enabled),
        ];

        for (const a of orderedAttrs) {
          const opts: any[] = Array.isArray(a?.options) ? a.options : [];
          // Prefer enabled options, but fall back if needed
          const orderedOpts = [
            ...opts.filter(o => !!o?.enabled),
            ...opts.filter(o => !o?.enabled),
          ];
          const hit = orderedOpts.find(
            o => (o?.name || '').trim().toLowerCase() === needle
          );
          if (hit) return { attributeId: a.id, optionId: hit.id };
        }

        return { attributeId: null, optionId: null };
      };
    }, []);

    // --- Helper: ensure atomic update for closure selection ---
    const selectOptionOnAttribute = async (
      attributeId: number | null,
      optionId: number | null
    ) => {
      if (!attributeId || !optionId || isSelecting) return;

      setIsSelecting(true);
      if (selectGuardTimerRef.current) {
        window.clearTimeout(selectGuardTimerRef.current);
      }
      selectGuardTimerRef.current = window.setTimeout(() => {
        setIsSelecting(false);
        selectGuardTimerRef.current = null;
      }, 5000);
      try {
        const attrId = Number(attributeId);
        const optId  = Number(optionId);
        if (!Number.isFinite(attrId) || !Number.isFinite(optId)) return;

        // Ensure we're on the Closure step (defensive)
        const isClosure = /closure/i.test(selectedStep?.name || '');
        if (!isClosure) {
          const closureStep = selectedGroup?.steps?.find(s => /closure/i.test(s?.name || ''));
          if (closureStep) {
            selectStep(closureStep.id);
          }
        }

        if (selectedAttributeId !== attrId) {
          selectAttribute(attrId);
        }

        // Fire-and-forget select
        selectOption(optId);
      } finally {
        // keep isSelecting true until observed in state
      }
    };

    const onPickWood = async (name: string, hex: string) => {
      setClosureWood({ name, hex });
      const { attributeId, optionId } = findOptionInStepByName(selectedStep, name);
      await selectOptionOnAttribute(attributeId, optionId);
    };

    const onPickWax = async (name: string, hex: string) => {
      if (!hex) {
        // No Wax Seal
        setClosureWax(null);
        const { attributeId, optionId } = findOptionInStepByName(selectedStep, 'No Wax Seal');
        await selectOptionOnAttribute(attributeId, optionId);
        return;
      }
      const full = `Wax Sealed in ${name}`; // matches option names
      setClosureWax({ name: full, hex });
      const { attributeId, optionId } = findOptionInStepByName(selectedStep, full);
      await selectOptionOnAttribute(attributeId, optionId);
    };


    const onLabelStep =
      (selectedStep?.name || '').toLowerCase().includes('design') ||
      (selectedStep?.name || '').toLowerCase().includes('label');


    // Step validation helpers
    const stepNameLc = (selectedStep?.name || '').toLowerCase();
    const isBottleStep  = stepNameLc.includes('bottle');
    const isLiquidStep  = stepNameLc.includes('gin') || stepNameLc.includes('liquid');
    const isClosureStep = stepNameLc.includes('closure');
    const hasValidSelection = !!(selectedAttribute?.options?.some(o => o.selected && o.name !== 'No Selection'));

    useEffect(() => {
      if (!isSelecting) return;
      if (!isClosureStep) {
        if (selectGuardTimerRef.current) {
          window.clearTimeout(selectGuardTimerRef.current);
          selectGuardTimerRef.current = null;
        }
        setIsSelecting(false);
        return;
      }
      const opts = selectedAttribute?.options || [];
      const hasSel = !!opts.find(o => o.selected && o.name !== 'No Selection');
      if (hasSel) {
        if (selectGuardTimerRef.current) {
          window.clearTimeout(selectGuardTimerRef.current);
          selectGuardTimerRef.current = null;
        }
        setIsSelecting(false);
      }
    }, [isSelecting, isClosureStep, selectedAttribute?.options]);

    useEffect(() => {
      return () => {
        if (selectGuardTimerRef.current) {
          window.clearTimeout(selectGuardTimerRef.current);
          selectGuardTimerRef.current = null;
        }
      };
    }, []);

    // Closure options can live on step or attribute depending on Zakeke setup
    const closureOptions = useMemo(() => {
      const stepOpts = (isClosureStep && selectedStep && Array.isArray((selectedStep as any).options))
        ? ((selectedStep as any).options as any[])
        : [];
      const attrOpts = (selectedAttribute && Array.isArray((selectedAttribute as any).options))
        ? ((selectedAttribute as any).options as any[])
        : [];
      // Prefer step-level options when present
      return stepOpts.length ? stepOpts : attrOpts;
    }, [isClosureStep, selectedStep, selectedAttribute]);

    // const getOptionIdByName = (name: string) => {
    //   const needle = (name || '').trim().toLowerCase();
    //   const hit = closureOptions.find(o => (o.name || '').trim().toLowerCase() === needle);
    //   return hit?.id ?? null;
    // };

    const handleLabelFieldChange = (
      key: 'title' | 'prompt' | 'primaryColor' | 'secondaryColor'
    ) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setLabelForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleLabelCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const checked = event.target.checked;
      setLabelForm((prev) => ({ ...prev, hasCharacterPermission: checked }));
    };

    const setWizardField = <K extends keyof LabelWizardState>(key: K, value: LabelWizardState[K]) => {
      setLabelWizard((prev) => ({ ...prev, [key]: value }));
    };

    const toggleWizardMulti = (key: 'mainStyling' | 'accents', value: string, cap = 4) => {
      setLabelWizard((prev) => {
        const existing = prev[key];
        const has = existing.includes(value);
        const next = has ? existing.filter((v) => v !== value) : [...existing, value].slice(0, cap);
        return { ...prev, [key]: next };
      });
    };

    const handleLabelFileChange = (
      key: 'characterFile' | 'logoFile'
    ) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      setLabelForm((prev) => ({ ...prev, [key]: file }));
    };

    const clearLabelFile = (key: 'characterFile' | 'logoFile') => {
      setLabelForm((prev) => ({
        ...prev,
        [key]: null,
        ...(key === 'characterFile' ? { hasCharacterPermission: false } : {}),
      }));
      setReviewImagesVisible(true);
    };

    const handleUploadLabelFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      setUploadLabelFile(file);
    };

    const handleUploadLabelLater = async () => {
      if (!canDesign) {
        setWarning(`Please select ${requireBottle ? 'a bottle, ' : ''}a liquid and a closure before designing labels.`);
        return;
      }
      setActiveDesignSide('front');

      const bottleName = (miniBottle?.name || defaultBottleName || '').trim().toLowerCase();
      const templateUrl = `https://spirits-studio.s3.eu-west-2.amazonaws.com/templates/upload-later/${bottleName}.png`;
      const frontAreaId = product?.areas.find(
        (area) => (area?.name || '').toLowerCase() === `${bottleName}_label_front`
      )?.id;

      if (!frontAreaId) {
        setWarning('Could not find the front label area for this bottle.');
        return;
      }

      setLabelError(false);
      setLabelRequestKind('uploadLater');
      setGuidedGenerating(true);

      try {
        const frontImage = await createImageFromUrl(templateUrl);
        if (!frontImage?.imageID) {
          throw new Error('Template image could not be created');
        }

        await addItemImage(frontImage.imageID, frontAreaId);
        setLabelDesign('front', {
          id: `upload-later-${bottleName}-${Date.now()}`,
          designSide: 'front',
          uploadLaterTemplate: true,
          templateUrl,
          s3url: templateUrl,
          frontS3Url: templateUrl,
          url: templateUrl,
        });
        setGuidedGenerating(false);
      } catch (error) {
        console.warn('Failed to apply upload-later template', error);
        setGuidedGenerating(false);
        setLabelError(true);
        setWarning('Unable to load the upload-later template right now. Please try again.');
      }
    };

    const handleUploadLabelSubmit = async () => {
      if (!uploadLabelFile) return;
      setActiveDesignSide('front');
      let dataUrl = '';
      try {
        dataUrl = await fileToDataUrl(uploadLabelFile);
      } catch (error) {
        console.warn('Failed to read upload label file', error);
      }
      
      console.log("postMessage content:", {
        customMessageType: 'customLabelUploaded',
        message: { 
          designSide: 'front', 
          bottleName: (miniBottle?.name || '').trim(),
          sessionId: sessionStorage.getItem('ss_session_id') || (window as any).SS?.getSessionId?.() || String(Date.now()),
          fileName: uploadLabelFile.name || '',
          fileType: uploadLabelFile.type || '',
          fileSize: uploadLabelFile.size || 0,
          dataUrl,
        },
      });

      postToParent({
        customMessageType: 'customLabelUploaded',
        message: { 
          designSide: 'front', 
          bottleName: (miniBottle?.name || '').trim(),
          sessionId: sessionStorage.getItem('ss_session_id') || (window as any).SS?.getSessionId?.() || String(Date.now()),
          fileName: uploadLabelFile.name || '',
          fileType: uploadLabelFile.type || '',
          fileSize: uploadLabelFile.size || 0,
          dataUrl,
        },
      });
    };

    const fileToDataUrl = (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

    const resolveOther = (value: string, other: string, otherToken = 'Other') => {
      if (value !== otherToken) return value;
      return other.trim();
    };

    const assemblePrompt = () => {
      const resolvedTheme = resolveOther(labelWizard.theme, labelWizard.themeOther);
      const resolvedSubTheme = labelWizard.subTheme || '';
      const resolvedMainType = resolveOther(labelWizard.mainSubjectType, labelWizard.mainSubjectTypeOther);
      const resolvedMainSubject = resolveOther(labelWizard.mainSubject, labelWizard.mainSubjectOther);
      const resolvedAction = resolveOther(labelWizard.action, labelWizard.actionOther);
      const resolvedStyle = resolveOther(labelWizard.styleFamily, labelWizard.styleFamilyOther);
      const resolvedPalette = resolveOther(labelWizard.paletteVibe, labelWizard.paletteVibeOther, 'Pick my own');

      const subject = resolvedMainSubject && resolvedMainSubject !== 'Upload my own'
        ? resolvedMainSubject
        : (resolvedMainType ? resolvedMainType.toLowerCase() : 'subject');

      const action = resolvedAction ? resolvedAction : '';
      const themePart = resolvedTheme ? `in ${resolvedTheme}` : '';
      const subThemePart = resolvedSubTheme ? `in a ${resolvedSubTheme}` : '';
      const locationPart = [subThemePart, themePart].filter(Boolean).join(', ');

      const stylePart = resolvedStyle ? `Style should be ${resolvedStyle}` : '';
      const palettePart = resolvedPalette ? `with a ${resolvedPalette} palette` : '';
      const stylePalette = [stylePart, palettePart].filter(Boolean).join(', ');

      const core = [
        `A ${subject}`,
        action ? `${action}` : '',
        locationPart ? `${locationPart}` : '',
      ].filter(Boolean).join(' ');

      const sentence = [core, stylePalette].filter(Boolean).join('. ');
      return sentence.replace(/\s+/g, ' ').trim();
    };

    const handleGenerateLabel = async (options: { confirmGuidedPrompt?: boolean } = {}) => {
      if (!canDesign) {
        setWarning(`Please select ${requireBottle ? 'a bottle, ' : ''}a liquid and a closure before designing labels.`);
        return;
      }
      setActiveDesignSide('front');
      const assembledPrompt = assemblePrompt();
      const finalPrompt =
        labelMode === 'form'
          ? labelForm.prompt.trim()
          : (promptOverride.trim() || assembledPrompt);
      if (!labelForm.title.trim() || !finalPrompt) {
        setWarning('Please provide both a Title and a label description.');
        return;
      }
      if ((labelForm.characterFile || labelForm.logoFile) && !labelForm.hasCharacterPermission) {
        setWarning('Please confirm you have permission to use the uploaded files.');
        return;
      }
      setLabelError(false);
      setLabelRequestKind('create');
      setGuidedGenerating(true);
      setGuidedEditMode(false);
      setGuidedEditNotes('');
      if (options.confirmGuidedPrompt) {
        setGuidedPromptConfirmed(true);
      }

      const includeHexes = !!(labelForm.primaryColor || labelForm.secondaryColor);
      const subtitle = (miniLiquid?.name || '').trim();
      const payload: any = {
        designSide: 'front',
        alcoholName: subtitle,
        bottleName: (miniBottle?.name || '').trim(),
        liquidName: (miniLiquid?.name || '').trim(),
        closureName: (miniClosure?.name || '').trim(),
        displayName: labelForm.title.trim(),
        title: labelForm.title.trim(),
        subtitle,
        prompt: finalPrompt,
        primaryColor: includeHexes ? labelForm.primaryColor.trim() : '',
        secondaryColor: includeHexes ? labelForm.secondaryColor.trim() : '',
        includeHexes,
        sessionId: sessionStorage.getItem('ss_session_id') || (window as any).SS?.getSessionId?.() || String(Date.now()),
        logoDataUrl: '',
        characterDataUrl: '',
      };

      try {
        if (labelForm.logoFile) {
          payload.logoDataUrl = await fileToDataUrl(labelForm.logoFile);
        }
      } catch (error) {
        console.warn('Failed to read logo file', error);
      }

      try {
        if (labelForm.characterFile) {
          payload.characterDataUrl = await fileToDataUrl(labelForm.characterFile);
        }
      } catch (error) {
        console.warn('Failed to read character file', error);
      }
      console.log("postMessage Content:", {
        messageContent: 'generateLabelImage',
        message: payload,
      })
      postToParent({
        messageContent: 'generateLabelImage',
        message: payload,
      });
    };

    const handleSendRevision = (critique: string) => {
      const trimmed = (critique || '').trim();
      if (!trimmed) {
        setWarning('Please enter revision notes.');
        return;
      }
      setActiveDesignSide('front');
      const prev = labelDesigns?.front || null;
      const prevInput = (prev?.aiInput && typeof prev.aiInput === 'object') ? prev.aiInput : {};
      const previousDataUrlCandidate =
        (typeof prev?.frontImage === 'string' && prev.frontImage.startsWith('data:') ? prev.frontImage : '') ||
        (Array.isArray(prev?.images) && typeof prev.images[0] === 'string' && prev.images[0].startsWith('data:') ? prev.images[0] : '') ||
        (typeof prev?.imageDataUrl === 'string' && prev.imageDataUrl.startsWith('data:') ? prev.imageDataUrl : '');
      const previousImage =
        previousDataUrlCandidate ||
        prev?.frontS3Url ||
        prev?.s3url ||
        prev?.url ||
        (Array.isArray(prev?.images) ? prev.images[0] : '') ||
        '';
      if (!previousImage) {
        setWarning('No previous label image found to revise.');
        return;
      }
      const fallbackPrompt = (labelMode === 'guided' ? (promptOverride.trim() || assemblePrompt()) : labelForm.prompt.trim());
      const inheritedPrompt = String(prevInput.prompt || prev?.prompt || fallbackPrompt || '').trim();
      const inheritedTitle = String(prevInput.title || prev?.title || labelForm.title || '').trim();
      const inheritedSubtitle = String(prevInput.subtitle || prev?.subtitle || miniLiquid?.name || '').trim();
      const inheritedPrimary = String(prevInput.primaryColor || prev?.primaryColor || labelForm.primaryColor || '').trim();
      const inheritedSecondary = String(prevInput.secondaryColor || prev?.secondaryColor || labelForm.secondaryColor || '').trim();
      const inheritedLogoDataUrl = String(prevInput.logoDataUrl || prev?.logoDataUrl || '').trim();
      const inheritedCharacterDataUrl = String(prevInput.characterDataUrl || prev?.characterDataUrl || '').trim();
      const includeHexes = Boolean(
        (prevInput.includeHexes ?? prev?.includeHexes) ?? (inheritedPrimary || inheritedSecondary)
      );
      const payload = {
        designSide: 'front',
        alcoholName: (miniLiquid?.name || '').trim(),
        bottleName: (miniBottle?.name || '').trim(),
        liquidName: (miniLiquid?.name || '').trim(),
        closureName: (miniClosure?.name || '').trim(),
        displayName: inheritedTitle,
        title: inheritedTitle,
        subtitle: inheritedSubtitle,
        prompt: inheritedPrompt,
        primaryColor: inheritedPrimary,
        secondaryColor: inheritedSecondary,
        includeHexes,
        logoDataUrl: inheritedLogoDataUrl,
        characterDataUrl: inheritedCharacterDataUrl,
        previousImage,
        critique: trimmed,
        sessionId: sessionStorage.getItem('ss_session_id') || (window as any).SS?.getSessionId?.() || String(Date.now()),
      };
      console.log("postMessage Content:", {
        messageContent: 'generateLabelRevision',
        message: payload,
      })

      postToParent({
        messageContent: 'generateLabelRevision',
        message: payload
      });
    };

    const handleGeneratePromptViaShopify = () => {
      setPromptError(false);
      setIsPromptGenerating(true);
      const payload = {
        subtitle: (miniLiquid?.name || '').trim(),
        theme: resolveOther(labelWizard.theme, labelWizard.themeOther),
        subTheme: labelWizard.subTheme || '',
        mainSubjectType: labelWizard.mainSubjectType || '',
        mainSubject: resolveOther(labelWizard.mainSubject, labelWizard.mainSubjectOther),
        action: resolveOther(labelWizard.action, labelWizard.actionOther),
        styleFamily: resolveOther(labelWizard.styleFamily, labelWizard.styleFamilyOther),
        paletteVibe: resolveOther(labelWizard.paletteVibe, labelWizard.paletteVibeOther, 'Pick my own'),
        primaryColor: labelForm.primaryColor,
        secondaryColor: labelForm.secondaryColor,
        hasCharacterPermission: labelForm.hasCharacterPermission,
      };

      console.log("postMessage Content:", {
        messageContent: 'generateLabelPrompt',
        message: payload,
      });

      console.log("postMessage Content:", {
        messageContent: 'generateLabelPrompt',
        message: payload,
      })

      postToParent({
        messageContent: 'generateLabelPrompt',
        message: payload,
      });

    };

    const handleLabelClick = (side: 'front' | 'back') => {
      if (!canDesign) {
        setWarning(`Please select ${requireBottle ? 'a bottle, ' : ''}a liquid and a closure before designing labels.`);
        return;
      }
      setActiveDesignSide(side);
      const hasDesign = side === 'front' ? !!labelDesigns.front : !!labelDesigns.back;
      const designType = hasDesign ? 'edit' : 'design';
      const designId = side === 'front'
        ? ((labelDesigns as any)?.front?.id ?? null)
        : ((labelDesigns as any)?.back?.id  ?? null);

      console.log("postMessage Content:", {
        customMessageType: 'callDesigner',
        message: {
          'order': {
            'bottle': productObject.selections.bottle,
            'liquid': productObject.selections.liquid,
            'closure': productObject.selections.closure,
            'label': productObject.selections.label,
            'closureExtras': productObject.selections.closureExtras,
          },
          'designSide': side,
          'designType': designType,
          'designId': designId,
          'productSku': product?.sku ?? null,
        }
      });

      postToParent({
        customMessageType: 'callDesigner',
        message: {
          'order': {
            'bottle': productObject.selections.bottle,
            'liquid': productObject.selections.liquid,
            'closure': productObject.selections.closure,
            'label': productObject.selections.label,
            'closureExtras': productObject.selections.closureExtras,
          },
          'designSide': side,
          'designType': designType,
          'designId': designId,
          'productSku': product?.sku ?? null,
        }
      });
    };    

    const handleLearnClick = (side?: 'front' | 'back') => {

      console.log("postMessage Content:", {
        customMessageType: 'OpenDesignerHelp',
        message: {
          ...(side ? { side } : {}),
          productSku: product?.sku ?? null,
        }
      });

      postToParent({
        customMessageType: 'OpenDesignerHelp',
        message: {
          ...(side ? { side } : {}),
          productSku: product?.sku ?? null,
        }
      });
    };
    

    if (!isInitialUiReady || !groups || groups.length === 0)
        return <LoadingSpinner />;
    
    const handleAddToCart = async () => {
    try {
        const bottleCameraKey = toBottleCameraKey(
          String(productObject?.selections?.bottle?.name || miniBottle?.name || defaultBottleName || '')
        );
        if (bottleCameraKey) {
          camAbort.current?.abort();
          pendingTourKeyRef.current = null;
          await moveCamera(`${bottleCameraKey}_full_front`, false);
          await waitSceneIdle(2200, 60);
          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => resolve());
            });
          });
        }

        await addToCart(
            {},
            async (data) => {
                console.log("data", data);
                const frontDesign = (labelDesigns as any)?.front || null;
                const labelUploadLater = Boolean(frontDesign?.uploadLaterTemplate);
                const labelTemplateUrl = labelUploadLater
                  ? String(frontDesign?.templateUrl || frontDesign?.frontS3Url || frontDesign?.s3url || frontDesign?.url || '')
                  : '';
                const displayName = String(
                  frontDesign?.displayName ||
                  frontDesign?.aiInput?.title ||
                  frontDesign?.title ||
                  labelForm.title ||
                  ''
                ).trim();

                console.log("postMessage Content:", {
                    customMessageType: "AddToCart",
                    message: {
                        sessionId: resolveSessionId(),
                        displayName,
                        preview: data.preview,
                        quantity: data.quantity,
                        compositionId: data.composition,
                        zakekeAttributes: data.attributes,
                        product_id: product?.sku || null,
                        bottle: productObject.selections.bottle,
                        liquid: productObject.selections.liquid,
                        closure: productObject.selections.closure,
                        label: productObject.selections.label,
                        closureExtras: closureChoices,
                        labelUploadLater,
                        labelTemplateUrl,
                    }
                }
                )

                postToParent({
                    customMessageType: "AddToCart",
                    message: {
                        sessionId: resolveSessionId(),
                        displayName,
                        preview: data.preview,
                        quantity: data.quantity,
                        compositionId: data.composition,
                        zakekeAttributes: data.attributes,
                        product_id: product?.sku || null,
                        bottle: productObject.selections.bottle,
                        liquid: productObject.selections.liquid,
                        closure: productObject.selections.closure,
                        label: productObject.selections.label,
                        closureExtras: closureChoices,
                        labelUploadLater,
                        labelTemplateUrl,
                    }
                });

                return data;
            },
            false 
        );
    } catch (error) {
        console.error('Error during addToCart:', error);
    }
};

    const frontLabelDesigned = Boolean(labelDesigns.front);
    const showAddToCartButton =
      productObject.valid &&
      frontLabelDesigned &&
      hasLabelOnBottle &&
      isCurrentLabelPreviewLoaded &&
      !guidedGenerating;

    return (
      <>
        <ConfigWarning />
        <LayoutWrapper>
        <ContentWrapper>
          <Container data-app-mode={mode}>
            {/* Step Navigation */}
            {selectedGroup && selectedGroup.steps.length > 0 && selectedStep && (
              <StepNav
                title={selectedStep.name}
                stepIndex={selectedGroup.steps.findIndex(s => s.id === selectedStep.id)}
                totalSteps={selectedGroup.steps.length}
                onPrev={() => {
                  const i = selectedGroup.steps.findIndex(s => s.id === selectedStep.id);
                  if (i > 0) selectStep(selectedGroup.steps[i - 1].id);
                }}
                onNext={() => {
                  const i = selectedGroup.steps.findIndex(s => s.id === selectedStep.id);
                  if (i < selectedGroup.steps.length - 1) {
                    if ((isBottleStep || isLiquidStep || isClosureStep) && !hasValidSelection) {
                      const which = isBottleStep ? 'bottle' : isLiquidStep ? 'liquid' : 'closure';
                      setWarning(`Please select a ${which} option (not "No Selection") to continue.`);
                      return;
                    }
                    const nextStep = selectedGroup.steps[i + 1];
                    const isLabelish = /label|design/i.test(nextStep?.name || '');
                    if (isLabelish && !canDesign) {
                      setWarning(`Please select ${requireBottle ? 'a bottle, ' : ''}a liquid and a closure (not "No Selection") before designing labels.`);
                      return;
                    }
                    selectStep(nextStep.id);
                  }
                }}
                disablePrev={selectedGroup.steps.findIndex(s => s.id === selectedStep.id) === 0}
                disableNext={
                  selectedGroup.steps.findIndex(s => s.id === selectedStep.id) === selectedGroup.steps.length - 1 ||
                  ((isBottleStep || isLiquidStep || isClosureStep) && !hasValidSelection) ||
                  (isClosureStep && isSelecting)
                }
              />
            )}

            {/* Options */}
            {/* Options (hidden on label step) */}
            {/* Options / Custom rendering for Closure step */}
            {!onLabelStep && !isClosureStep && (
              <OptionsWrap>
                {selectedAttribute?.options
                  .filter(() => true)
                  .map(option => (
                    option.name !== "No Selection" && (
                      <OptionListItem
                        key={option.id}
                        onClick={() => {
                          if (isSelecting) return;
                          console.log('User selected option:', {
                            name: option.name,
                            attribute: selectedAttribute.name,
                            enabled: option.enabled,
                            selected: option.selected
                          });
                          selectOption(option.id);
                        }}
                        $selected={option.selected}
                        $disabled={isSelecting}
                        $width="200px"
                        className={isSelecting ? 'is-selecting' : undefined}
                        aria-busy={isSelecting ? true : undefined}
                        tabIndex={0}
                      >
                        <OptionText>
                          <OptionTitle $selected={!!option.selected}>{option.name}</OptionTitle>
                          {selectedStep?.name === 'Select your Gin' && option.description && (
                            <OptionDescription>{option.description}</OptionDescription>
                          )}
                        </OptionText>
                      </OptionListItem>
                    )
                  ))}
              </OptionsWrap>
            )}

            {(!onLabelStep && isClosureStep) && (
              <ClosureSections>
                {/* Wood section */}
                <div>
                  <SectionTitle>{isLiteMode ? 'Choose Your Closure' : 'Choose Your Wood'}</SectionTitle>
                  <SwatchGrid>
                    {WOOD_SWATCHES.map(s => {
                      const selected = closureChoices?.wood?.hex === s.hex;
                      return (
                        <SwatchButton
                          key={s.key}
                          aria-label={s.key}
                          onClick={() => onPickWood(s.key, s.hex)}
                          $disabled={isSelecting}
                          className={isSelecting ? 'is-selecting' : undefined}
                          $selected={selected}
                          $hex={s.hex}
                          data-swatch-label={s.key}
                        />
                      );
                    })}
                  </SwatchGrid>
                </div>

                {/* Wax section */}
                {!isLiteMode && closureChoices?.wood?.hex && (
                  <div>
                    <SectionTitle>Choose a Wax Colour</SectionTitle>
                    <SwatchGrid>
                      {WAX_SWATCHES.map(s => {
                        const isNone = s.key === 'No Wax Seal';
                        const selected = isNone ? !closureChoices?.wax : closureChoices?.wax?.hex === s.hex;
                        return (
                          <SwatchButton
                            key={s.key}
                            aria-label={s.key}
                            onClick={() => onPickWax(s.key, s.hex)}
                            $disabled={isSelecting}
                            className={isSelecting ? 'is-selecting' : undefined}
                          $selected={selected}
                          $hex={s.hex}
                          $isNone={isNone}
                          data-swatch-label={isNone ? '' : s.key}
                        >
                            {isNone && (<SwatchNoneLabel>None</SwatchNoneLabel>)}
                          </SwatchButton>
                        );
                      })}
                    </SwatchGrid>
                  </div>
                )}
              </ClosureSections>
            )}

            {onLabelStep && (
              <LabelDesignWrap>
                  {!hideLabelTabs ? (
                    <LabelTabs>
                      <LabelTabButton
                        type="button"
                        $active={labelMode === 'form'}
                        onClick={() => setLabelMode('form')}
                      >
                        Prompt AI
                      </LabelTabButton>
                      <LabelTabButton
                        type="button"
                        $active={labelMode === 'guided'}
                        onClick={() => setLabelMode('guided')}
                      >
                        Guided AI Prompt
                      </LabelTabButton>
                      <LabelTabButton
                        type="button"
                        $active={labelMode === 'upload'}
                        onClick={() => setLabelMode('upload')}
                      >
                        Upload Label
                      </LabelTabButton>
                    </LabelTabs>
                  ) : null}

                <LabelForm onSubmit={(event) => event.preventDefault()}>
                  {showPromptFormBuilder ? (
                    <LabelField>
                      Title
                      <LabelInput
                        type="text"
                        value={labelForm.title}
                        onChange={handleLabelFieldChange('title')}
                        placeholder="e.g. Spirits Studio"
                      />
                    </LabelField>
                  ) : null}

                  {showPromptFormBuilder && (
                    <LabelField>
                      Describe your label
                      <LabelTextarea
                        value={labelForm.prompt}
                        onChange={handleLabelFieldChange('prompt')}
                        placeholder="Describe the mood, style, and motifs you want."
                      />
                    </LabelField>
                  )}

                  {showLabelLoadingState && (
                    <ActionsCenter>
                      <PromptLoading>
                        <PromptSpinner />
                        <PromptFadeText>
                          {(labelRequestKind === 'edit' ? labelEditLoadingMessages : labelLoadingMessages)[
                            Math.min(
                              labelLoadingIndex,
                              (labelRequestKind === 'edit' ? labelEditLoadingMessages.length : labelLoadingMessages.length) - 1
                            )
                          ]}
                        </PromptFadeText>
                      </PromptLoading>
                    </ActionsCenter>
                  )}

                  {labelMode === 'guided' && promptError && !isPromptGenerating && (
                    <ActionsCenter>
                      <PromptLoading>
                        <div>We couldn't generate your prompt right now.</div>
                        <button
                          className="configurator-button"
                          type="button"
                          onClick={() => {
                            setPromptError(false);
                            setIsPromptGenerating(false);
                          }}
                        >
                          Try Again
                        </button>
                      </PromptLoading>
                    </ActionsCenter>
                  )}

                  {labelMode === 'guided' && !guidedGenerating && !promptError && (
                    <WizardWrap>
                      {!wizardStarted ? (
                        <>
                          <LabelField>
                            Title
                            <LabelInput
                              type="text"
                              value={labelForm.title}
                              onChange={handleLabelFieldChange('title')}
                              placeholder="e.g. Spirits Studio"
                            />
                          </LabelField>
                          <WizardNav>
                            <button
                              className="configurator-button"
                              type="button"
                              disabled={!labelForm.title.trim()}
                              onClick={() => {
                                setWizardStarted(true);
                                setWizardStepIndex(0);
                              }}
                            >
                              Next
                            </button>
                          </WizardNav>
                        </>
                      ) : (
                        (() => {
                          const themeMap: Record<string, string[]> = {
                            'Nature and outdoors': ['Alpine', 'Tropical', 'Desert', 'Coastal', 'Forest', 'Arctic'],
                            'City and nightlife': ['Neon market', 'Rooftop', 'Alleyway', 'Skyline', 'Metro', 'Canal'],
                            'Fantasy and magic': ['Ancient ruins', 'Enchanted forest', 'Arcane library', 'Crystal cave'],
                            'Sci-fi and cyber': ['Neon grid', 'Orbital station', 'Mech yard', 'Holo city'],
                            'Retro and nostalgia': ['70s lounge', '80s arcade', 'Vintage diner', 'Analog lab'],
                            'Luxury and minimal': ['Marble hall', 'Monochrome studio', 'Gold leaf', 'Velvet lounge'],
                            'Pop and playful': ['Candy world', 'Toybox', 'Bubble city', 'Sticker bomb'],
                            'Dark and moody': ['Foggy alley', 'Moonlit dock', 'Stormy coast', 'Shadowed hall'],
                            'Mythology and folklore': ['Greek temple', 'Nordic fjord', 'Desert shrine', 'Celtic grove'],
                            'Food and craft': ['Distillery', 'Bakery', 'Spice market', 'Botanical lab'],
                          };

                          const mainSubjectMap: Record<string, string[]> = {
                            Person: ['Sailor', 'Botanist', 'Bartender', 'Astronaut', 'Punk', 'Monk', 'Detective', 'Farmer', 'Dancer'],
                            Animal: ['Fox', 'Stag', 'Raven', 'Octopus', 'Tiger', 'Whale', 'Snake', 'Bee'],
                            Creature: ['Dragon', 'Golem', 'Phoenix', 'Griffin', 'Spirit', 'Leviathan'],
                            Object: ['Bottle', 'Sword', 'Lantern', 'Car', 'Flower', 'Compass'],
                            Place: ['Lighthouse', 'Temple', 'Castle', 'Observatory', 'Bridge'],
                            Symbol: ['Skull', 'Sun', 'Compass rose', 'Moon', 'Eye'],
                          };

                          const paletteVibes = ['Warm earthy', 'Cold icy', 'Neon cyber', 'Pastel', 'Luxury dark', 'Tropical bright', 'Autumnal', 'High-contrast comic', 'Monochrome', 'Pick my own'];

                          const steps = [
                            {
                              key: 'theme',
                              title: 'Pick a concept theme',
                              options: [...Object.keys(themeMap), 'Other'],
                              allowOther: true,
                              otherKey: 'themeOther',
                            },
                            {
                              key: 'subTheme',
                              title: 'Pick a sub-theme',
                              options: labelWizard.theme && labelWizard.theme !== 'Other' ? themeMap[labelWizard.theme] : [],
                            },
                            {
                              key: 'mainSubjectType',
                              title: 'Main subject type',
                              options: [...Object.keys(mainSubjectMap)],
                            },
                            {
                              key: 'mainSubject',
                              title: 'Main subject',
                              options: labelWizard.mainSubjectType && labelWizard.mainSubjectType !== 'Other'
                                ? mainSubjectMap[labelWizard.mainSubjectType]
                                : [],
                              extraOptions: ['Other', 'Upload my own'],
                              allowOther: true,
                              otherKey: 'mainSubjectOther',
                            },
                            {
                              key: 'action',
                              title: 'What’s the subject doing?',
                              options: ['Standing / posing', 'Walking / running', 'Working (crafting, distilling, painting)', 'Fighting / chasing', 'Celebrating / dancing', 'Exploring / searching', 'Transforming (magic, morphing)', 'Floating / falling', 'Looking back / dramatic stare', 'Other'],
                              allowOther: true,
                              otherKey: 'actionOther',
                            },
                            {
                              key: 'styleFamily',
                              title: 'Style family',
                              options: ['Illustration', 'Painterly', 'Graphic poster', 'Vintage print', 'Photoreal / cinematic', '3D / render', 'Anime / manga', 'Pixel / low-fi', 'Minimal / abstract', 'Other'],
                              allowOther: true,
                              otherKey: 'styleFamilyOther',
                            },
                            {
                              key: 'paletteVibe',
                              title: 'Palette vibe',
                              options: paletteVibes,
                            },
                            {
                              key: 'logo',
                              title: 'Include a logo',
                              options: [],
                            },
                            {
                              key: 'review',
                              title: 'Review prompt',
                              options: [],
                              review: true,
                            },
                          ];

                          const currentStep = steps[wizardStepIndex] || steps[0];
                          const options = currentStep.options || [];
                          const mergedOptions = currentStep.extraOptions ? [...options, ...currentStep.extraOptions] : options;

                          const goNext = () => {
                            setWizardStepIndex((prev) => {
                              let next = Math.min(prev + 1, steps.length - 1);
                              const nextStep = steps[next];
                              if (nextStep?.key === 'subTheme' && (!labelWizard.theme || labelWizard.theme === 'Other')) {
                                next = Math.min(next + 1, steps.length - 1);
                              }
                              if (nextStep?.key === 'review' && (labelForm.logoFile || labelForm.characterFile)) {
                                setReviewImagesVisible(true);
                              }
                              if (currentStep.key === 'theme') {
                                setHideLabelTabs(true);
                              }
                              return next;
                            });
                          };
                          const goPrev = () => {
                            setWizardStepIndex((prev) => {
                              let next = Math.max(prev - 1, 0);
                              const nextStep = steps[next];
                              if (nextStep?.key === 'subTheme' && (!labelWizard.theme || labelWizard.theme === 'Other')) {
                                next = Math.max(next - 1, 0);
                              }
                              return next;
                            });
                          };

                          const promptValue = promptOverride || (isPromptGenerating ? '' : assemblePrompt());
                          const otherKey = currentStep.otherKey as keyof LabelWizardState | undefined;
                          const showOtherInput = currentStep.allowOther && (labelWizard as any)[currentStep.key] === 'Other';
                          const hasSelection =
                            currentStep.key === 'logo'
                              ? !!labelForm.logoFile
                              : Boolean((labelWizard as any)[currentStep.key]);
                          const showReviewColours = !!labelForm.primaryColor || !!labelForm.secondaryColor;
                          const showReviewImages = reviewImagesVisible || !!labelForm.logoFile || !!labelForm.characterFile;

                          if (currentStep.review && guidedPromptConfirmed) {
                            return null;
                          }

                          const showHeader = !isPromptGenerating;

                          return (
                            <>
                              {showHeader && !guidedPromptConfirmed && (
                                <WizardHeader>
                                  <WizardHeaderSide />
                                  <WizardStepTitle>{currentStep.title}</WizardStepTitle>
                                  <WizardHeaderSide $align="right">
                                    {wizardStarted && (
                                      <RestartButton
                                        type="button"
                                        aria-label="Reset"
                                        data-tooltip="Reset"
                                        onClick={() => {
                                          postToParent({
                                            customMessageType: 'labelReset',
                                            message: {
                                              designSide: activeDesignSide,
                                              sessionId:
                                                sessionStorage.getItem('ss_session_id') ||
                                                (window as any).SS?.getSessionId?.() ||
                                                String(Date.now()),
                                            },
                                          });
                                          setLabelForm({
                                            title: '',
                                            prompt: '',
                                            primaryColor: '',
                                            secondaryColor: '',
                                            characterFile: null,
                                            logoFile: null,
                                            hasCharacterPermission: false,
                                          });
                                          setLabelWizard({
                                            outputGoal: '',
                                            theme: '',
                                            themeOther: '',
                                            subTheme: '',
                                            settingType: '',
                                            settingSpecific: '',
                                            backgroundDepth: '',
                                            compositionLayout: '',
                                            framing: '',
                                            mainSubjectType: '',
                                            mainSubjectTypeOther: '',
                                            mainSubject: '',
                                            mainSubjectOther: '',
                                            mainStyling: [],
                                            supportingCount: '',
                                            supportingType: '',
                                            action: '',
                                            actionOther: '',
                                            energy: '',
                                            styleFamily: '',
                                            styleFamilyOther: '',
                                            styleSubtype: '',
                                            texture: '',
                                            lighting: '',
                                            paletteMode: '',
                                            paletteVibe: '',
                                            paletteVibeOther: '',
                                            accentCount: '',
                                            accents: [],
                                            labelTextSpace: '',
                                            complexity: '',
                                          });
                                          setWizardStepIndex(0);
                                          setWizardStarted(false);
                                          setGuidedPromptConfirmed(false);
                                          setGuidedGenerating(false);
                                          setReviewImagesVisible(false);
                                          setIsPromptGenerating(false);
                                          setPromptOverride('');
                                          setHideLabelTabs(false);
                                        }}
                                      >
                                        <span className="material-symbols-outlined">replay</span>
                                      </RestartButton>
                                    )}
                                  </WizardHeaderSide>
                                </WizardHeader>
                              )}
                            {!currentStep.review && currentStep.key !== 'logo' && (
                              <>
                                {mergedOptions.length === 0 ? (
                                  <LabelHelperText>
                                    Make a selection in the previous step to see options here, or skip.
                                  </LabelHelperText>
                                ) : (
                                    <WizardOptions>
                                      {mergedOptions.map((opt: string) => {
                                        const active = (labelWizard as any)[currentStep.key] === opt;
                                        return (
                                          <WizardOptionButton
                                            key={opt}
                                            type="button"
                                            $active={active}
                                            onClick={() => {
                                              if (active) {
                                                setWizardField(currentStep.key as keyof LabelWizardState, '' as any);
                                                return;
                                              }
                                              setWizardField(currentStep.key as keyof LabelWizardState, opt as any);
                                              if (opt === 'Other' || opt === 'Upload my own') return;
                                              if (currentStep.key === 'paletteVibe' && opt === 'Pick my own') return;
                                              setTimeout(() => {
                                                goNext();
                                              }, 200);
                                            }}
                                          >
                                            {opt}
                                          </WizardOptionButton>
                                        );
                                      })}
                                    </WizardOptions>
                                  )}
                                  {showOtherInput && otherKey && (
                                    <LabelField>
                                      Other
                                      <LabelInput
                                        type="text"
                                        value={(labelWizard as any)[otherKey] as string}
                                        onChange={(event) => setWizardField(otherKey, event.target.value)}
                                        placeholder="Type your option"
                                      />
                                    </LabelField>
                                  )}
                                </>
                              )}
                            {currentStep.key === 'logo' && (
                              <LabelField>
                                Optional
                                <LabelInput
                                  type="file"
                                  accept="image/*"
                                  onChange={handleLabelFileChange('logoFile')}
                                />
                                <LabelHelperText>
                                  {labelForm.logoFile?.name || 'No logo selected.'}
                                </LabelHelperText>
                              </LabelField>
                            )}
                            {currentStep.review && !guidedPromptConfirmed && (
                              isPromptGenerating ? (
                                <PromptLoading>
                                  <PromptSpinner />
                                  <PromptFadeText>
                                    {promptLoadingMessages[Math.min(promptLoadingIndex, promptLoadingMessages.length - 1)]}
                                  </PromptFadeText>
                                </PromptLoading>
                              ) : (
                                <>
                                  <LabelField>
                                    Title
                                    <LabelInput
                                      type="text"
                                      value={labelForm.title}
                                      onChange={handleLabelFieldChange('title')}
                                      placeholder="e.g. Spirits Studio"
                                    />
                                  </LabelField>
                                  <LabelField>
                                    Editable prompt
                                    <LabelTextarea
                                      value={promptValue}
                                      onChange={(event) => {
                                        setPromptOverride(event.target.value);
                                      }}
                                      placeholder="Your generated prompt will appear here."
                                    />
                                  </LabelField>
                                  {showReviewColours && (
                                    <LabelRowTight>
                                      {labelForm.primaryColor && (
                                        <LabelField>
                                          Primary colour
                                          <LabelInput
                                            type="color"
                                            value={labelForm.primaryColor}
                                            onChange={handleLabelFieldChange('primaryColor')}
                                          />
                                        </LabelField>
                                      )}
                                      {labelForm.secondaryColor && (
                                        <LabelField>
                                          Secondary colour
                                          <LabelInput
                                            type="color"
                                            value={labelForm.secondaryColor}
                                            onChange={handleLabelFieldChange('secondaryColor')}
                                          />
                                        </LabelField>
                                      )}
                                    </LabelRowTight>
                                  )}
                                  {showReviewImages && (
                                    <LabelRow>
                                      {(labelForm.logoFile || reviewImagesVisible) && (
                                        <LabelField>
                                          Include a logo
                                          {labelForm.logoFile ? (
                                            <FileNameRow>
                                              <span>{labelForm.logoFile.name}</span>
                                              <FileRemoveButton type="button" onClick={() => clearLabelFile('logoFile')}>×</FileRemoveButton>
                                            </FileNameRow>
                                          ) : (
                                            <LabelInput
                                              type="file"
                                              accept="image/*"
                                              onChange={handleLabelFileChange('logoFile')}
                                            />
                                          )}
                                        </LabelField>
                                      )}
                                      {(labelForm.characterFile || reviewImagesVisible) && (
                                        <LabelField>
                                          Include a character
                                          {labelForm.characterFile ? (
                                            <FileNameRow>
                                              <span>{labelForm.characterFile.name}</span>
                                              <FileRemoveButton type="button" onClick={() => clearLabelFile('characterFile')}>×</FileRemoveButton>
                                            </FileNameRow>
                                          ) : (
                                            <LabelInput
                                              type="file"
                                              accept="image/*"
                                              onChange={(event) => {
                                                handleLabelFileChange('characterFile')(event);
                                                setReviewImagesVisible(true);
                                              }}
                                            />
                                          )}
                                        </LabelField>
                                      )}
                                    </LabelRow>
                                  )}
                                  {(labelForm.logoFile || labelForm.characterFile) && (
                                    <LabelCheckboxRow>
                                      <input
                                        type="checkbox"
                                        checked={labelForm.hasCharacterPermission}
                                        onChange={handleLabelCheckboxChange}
                                      />
                                      I have the express permission/right to use any logo, or any image with the likeness of a character being uploaded for commercial purposes
                                    </LabelCheckboxRow>
                                  )}
                                </>
                              )
                            )}
                            {currentStep.key === 'paletteVibe' && labelWizard.paletteVibe === 'Pick my own' && (
                              <LabelRowTight>
                                <LabelField>
                                  Primary colour
                                  <LabelInput
                                    type="color"
                                    value={labelForm.primaryColor || '#f42492'}
                                    onChange={(event) => {
                                      handleLabelFieldChange('primaryColor')(event);
                                      setWizardField('paletteVibeOther', event.target.value);
                                    }}
                                  />
                                </LabelField>
                                <LabelField>
                                  Secondary colour
                                  <LabelInput
                                    type="color"
                                    value={labelForm.secondaryColor || '#111111'}
                                    onChange={handleLabelFieldChange('secondaryColor')}
                                  />
                                </LabelField>
                              </LabelRowTight>
                            )}
                            {currentStep.key === 'mainSubject' && labelWizard.mainSubject === 'Upload my own' && (
                              <LabelField>
                                Upload a character
                                <LabelInput
                                  type="file"
                                  accept="image/*"
                                  onChange={handleLabelFileChange('characterFile')}
                                />
                                <LabelDescription>
                                  Upload a character to include in the label.
                                </LabelDescription>
                                <LabelHelperText>
                                  {labelForm.characterFile?.name || 'No character uploaded.'}
                                </LabelHelperText>
                              </LabelField>
                            )}
                            {showHeader && !guidedPromptConfirmed && (
                              <WizardNav>
                                <button
                                  className="wizard-ghost"
                                  type="button"
                                  onClick={goPrev}
                                  disabled={wizardStepIndex === 0}
                                >
                                  Back
                                </button>
                                {currentStep.review ? (
                                  <button
                                    className="configurator-button"
                                    type="button"
                                    disabled={!!(labelForm.logoFile || labelForm.characterFile) && !labelForm.hasCharacterPermission}
                                    onClick={async () => {
                                      await handleGenerateLabel({ confirmGuidedPrompt: true });
                                    }}
                                  >
                                    Confirm &amp; Generate
                                  </button>
                                ) : (
                                  <button
                                    className={currentStep.key === 'logo' ? 'configurator-button' : 'wizard-ghost'}
                                    type="button"
                                    onClick={() => {
                                      if (currentStep.key === 'logo') {
                                        handleGeneratePromptViaShopify();
                                        goNext();
                                        return;
                                      }
                                      goNext();
                                    }}
                                  >
                                    {currentStep.key === 'logo' ? 'Generate' : (hasSelection ? 'Next' : 'Skip')}
                                  </button>
                                )}
                              </WizardNav>
                            )}
                          </>
                        );
                      })()
                      )}
                    </WizardWrap>
                  )}

                  {isAiLabelMode && hasLabelOnBottle && !guidedEditMode && (
                    <WizardWrap>
                      {isCurrentLabelPreviewLoaded && (
                        <LabelPreviewReveal $visible={showLoadedLabelPreview}>
                          <LabelPreviewImage
                            src={loadedLabelPreviewUrl}
                            alt="Generated label preview"
                            draggable={false}
                            onContextMenu={(event) => event.preventDefault()}
                          />
                        </LabelPreviewReveal>
                      )}
                      {!isCurrentLabelPreviewLoaded && (
                        <PromptLoading>
                          <div>Finalising label preview…</div>
                        </PromptLoading>
                      )}
                      {isCurrentLabelPreviewLoaded && (
                        <GuidedActionRow>
                          <button
                            className="wizard-ghost guided-action"
                            type="button"
                            onClick={() => setGuidedEditMode(true)}
                          >
                            Make Edits
                          </button>
                        </GuidedActionRow>
                      )}
                    </WizardWrap>
                  )}

                  {isAiLabelMode && hasLabelOnBottle && guidedEditMode && !showLabelLoadingState && (
                    <WizardWrap>
                      <SectionTitle>Edit Your Label</SectionTitle>
                      <LabelField>
                        Describe your edits
                        <LabelTextarea
                          value={guidedEditNotes}
                          onChange={(event) => setGuidedEditNotes(event.target.value)}
                          placeholder="Describe what you want to change about the label."
                        />
                      </LabelField>
                      <GuidedActionRow>
                        <button
                          className="configurator-button guided-action"
                          type="button"
                          disabled={!guidedEditNotes.trim()}
                          onClick={() => {
                            setLabelError(false);
                            setLabelRequestKind('edit');
                            setGuidedGenerating(true);
                            handleSendRevision(guidedEditNotes);
                          }}
                        >
                          Generate Edits
                        </button>
                      </GuidedActionRow>
                    </WizardWrap>
                  )}

                  {showUploadLabelForm && (
                    <WizardWrap>
                      <LabelHelperText>
                        <a href="#" onClick={(event) => event.preventDefault()}>
                          Download design template
                        </a>
                      </LabelHelperText>
                      <LabelField>
                        Upload your label file
                        <LabelInput
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleUploadLabelFileChange}
                        />
                        <LabelHelperText>
                          Upload a PNG, JPG, or PDF label file.
                        </LabelHelperText>
                      </LabelField>
                      <WizardNav>
                        <button
                          className="configurator-button"
                          type="button"
                          onClick={handleUploadLabelLater}
                        >
                          Upload Label Later
                        </button>
                        <button
                          className="configurator-button"
                          type="button"
                          disabled={!uploadLabelFile}
                          onClick={handleUploadLabelSubmit}
                        >
                          Upload Label
                        </button>
                      </WizardNav>
                    </WizardWrap>
                  )}

                  {showPromptFormBuilder && (
                    <LabelDetails>
                      <LabelSummary>
                        Select colours
                        <LabelSummaryMeta>Optional</LabelSummaryMeta>
                      </LabelSummary>
                      <LabelRowTight>
                        <LabelField>
                          Primary colour
                          <LabelInput
                            type="color"
                            value={labelForm.primaryColor || '#f42492'}
                                    onChange={(event) => {
                                      handleLabelFieldChange('primaryColor')(event);
                                      if (labelWizard.paletteVibe === 'Pick my own') {
                                        setWizardField('paletteVibeOther', event.target.value);
                                      }
                                    }}
                          />
                        </LabelField>
                        <LabelField>
                          Secondary colour
                          <LabelInput
                            type="color"
                            value={labelForm.secondaryColor || '#111111'}
                            onChange={handleLabelFieldChange('secondaryColor')}
                          />
                        </LabelField>
                      </LabelRowTight>
                    </LabelDetails>
                  )}

                  {showPromptFormBuilder && (
                    <LabelDetails>
                      <LabelSummary>
                        Include images
                        <LabelSummaryMeta>Optional</LabelSummaryMeta>
                      </LabelSummary>
                      <LabelRow>
                        <LabelField>
                          Include a logo
                          <LabelInput
                            type="file"
                            accept="image/*"
                            onChange={handleLabelFileChange('logoFile')}
                          />
                          <LabelDescription>
                            Upload a logo to include in the label.
                          </LabelDescription>
                          <LabelHelperText>
                            {labelForm.logoFile?.name || 'No logo uploaded.'}
                          </LabelHelperText>
                        </LabelField>
                        <LabelField>
                          Include a character
                          <LabelInput
                            type="file"
                            accept="image/*"
                            onChange={handleLabelFileChange('characterFile')}
                          />
                          <LabelDescription>
                            Upload a character to include in the label.
                          </LabelDescription>
                          <LabelHelperText>
                            {labelForm.characterFile?.name || 'No character uploaded.'}
                          </LabelHelperText>
                        </LabelField>
                      </LabelRow>
                    </LabelDetails>
                  )}

                  {showPromptFormBuilder && (labelForm.logoFile || labelForm.characterFile) && (
                    <LabelCheckboxRow>
                      <input
                        type="checkbox"
                        checked={labelForm.hasCharacterPermission}
                        onChange={handleLabelCheckboxChange}
                      />
                      I have the express permission/right to use any logo, or any image with the likeness of a character being uploaded for commercial purposes
                    </LabelCheckboxRow>
                  )}

                  {showPromptFormBuilder && (
                    <ActionsCenter>
                      <button
                        className="configurator-button"
                        disabled={!canDesign || (!!(labelForm.logoFile || labelForm.characterFile) && !labelForm.hasCharacterPermission)}
                        data-tooltip={
                          !canDesign
                            ? (requireBottle ? 'Select bottle, liquid, and closure first' : 'Select liquid and closure first')
                            : ((labelForm.logoFile || labelForm.characterFile) && !labelForm.hasCharacterPermission)
                              ? 'Confirm you have permission to use the uploaded files'
                              : undefined
                        }
                        type="button"
                        onClick={() => {
                          handleGenerateLabel();
                        }}
                      >
                        Generate Label
                      </button>
                    </ActionsCenter>
                  )}

                  {showLabelErrorState && (
                    <ActionsCenter>
                      <PromptLoading>
                        <div>
                          {labelRequestKind === 'uploadLater'
                            ? "We couldn't load your upload-later template right now."
                            : labelRequestKind === 'edit'
                            ? "We couldn't generate your label edits right now."
                            : "We couldn't generate your label right now."}
                        </div>
                        <button
                          className="configurator-button"
                          type="button"
                          onClick={() => setLabelError(false)}
                        >
                          Try Again
                        </button>
                      </PromptLoading>
                    </ActionsCenter>
                  )}
                </LabelForm>
              </LabelDesignWrap>
            )}

            {(() => {
              const stepName = (selectedStep?.name || '').toLowerCase();
              const notesAllowed = /bottle|gin|liquid/.test(stepName);
              return notesAllowed && selectedStep?.name && selectedAttribute && selectedAttribute.options.find(opt => opt.selected && opt.name !== "No Selection");
            })() && (
              <NotesWrapper>
                <strong>
                  {(() => {
                    const stepName = (selectedStep?.name || '').toLowerCase();

                    if (stepName.includes('bottle')) return 'Bottle Style';
                    if (
                      stepName.includes('gin') || 
                      stepName.includes('vodka') ||
                      stepName.includes('whiskey') ||
                      stepName.includes('rum')
                    ) return 'Tasting Notes';
                    if (stepName.includes('closure')) return 'Closure';

                    return 'Notes';
                  })()}
                </strong>
                <p>
                  {(() => {
                    const selectedOption = selectedAttribute?.options?.find(opt => opt.selected) || null;
                    if (!selectedOption) return 'Select an option to see notes.';

                    const stepName = (selectedStep?.name || '').toLowerCase();
                    const category =
                      stepName.includes('bottle') ? 'bottles' :
                        stepName.includes('gin') || stepName.includes('liquid') ? 'liquids' :
                          stepName.includes('closure') ? 'closures' :
                            null as 'bottles' | 'liquids' | 'closures' | null;

                    if (!category || !(optionNotes as any)[category]) return null;

                    return ((optionNotes as any)[category][selectedOption.name]) || '';
                  })()}
                </p>
              </NotesWrapper>
            )}
          </Container>
        </ContentWrapper>
        <ViewportSpacer />
        <CartBar
          price={price}
          showButton={showAddToCartButton}
          loading={isAddToCartLoading}
          onAdd={handleAddToCart}
          renderSpinner={<ClipLoader color="#FFFFFF" size={40} loading={true} />}
        />
        </LayoutWrapper>
      </>
    );
};

export default Selector;
