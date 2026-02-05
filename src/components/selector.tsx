import React, { FunctionComponent, useEffect, useMemo, useRef, useState, useCallback, useLayoutEffect } from 'react';
// import styled from 'styled-components';
import { useZakeke } from 'zakeke-configurator-react';
import { LayoutWrapper, ContentWrapper, Container,  OptionListItem, NavButton, LoadingSpinner, NotesWrapper, CartBar, StepNav, OptionsWrap, OptionText, OptionTitle, OptionDescription, ClosureSections, SectionTitle, SwatchGrid, SwatchButton, SwatchNoneLabel, ActionsCenter, LabelDesignWrap, LabelTabs, LabelTabButton, LabelForm, LabelDetails, LabelSummary, LabelSummaryMeta, LabelRow, LabelField, LabelInput, LabelTextarea, LabelDescription, LabelHelperText, FileNameRow, FileRemoveButton, LabelCheckboxRow, WizardWrap, WizardStepTitle, WizardOptions, WizardOptionButton, WizardNav, WizardHeader, WizardHeaderSide, RestartButton, PromptLoading, PromptSpinner, ConfigWarning, ViewportSpacer } from './list';
// import { List, StepListItem, , ListItemImage } from './list';
import { optionNotes } from '../data/option-notes';
import ClipLoader from 'react-spinners/ClipLoader';
import { useOrderStore } from '../state/orderStore';
import { WOOD_SWATCHES, WAX_SWATCHES } from '../data/options';  



const Selector: FunctionComponent<{}> = () => {
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
        isAreaVisible,
        createImageFromUrl, 
        addItemImage,
        removeItem,
        // templates,
        // setTemplate,
        // setMeshDesignVisibility,
        // restoreMeshVisibility,
    } = useZakeke();

    
    console.log("groups", groups)
    console.log("product", product)
    console.log("items", items)
    console.log("price", price)
    console.log("isSceneLoading", isSceneLoading)
    

    const buildGroup = groups.find(g => g.name === "Build Your Bottle") ?? null;

    const steps = useMemo(() => buildGroup?.steps ?? [], [buildGroup]);

  
    const findStepIndex = (needle: string, fallbackIndex: number) => {
      const i = steps.findIndex(s => s.name?.toLowerCase().includes(needle));
      return i >= 0 ? i : fallbackIndex;
    };

    const bottleStepIdx = findStepIndex('bottle', 0);
    const liquidStepIdx = findStepIndex('gin', 1);
    const closureStepIdx = findStepIndex('closure', 2);
    const labelStepIdx  = findStepIndex('label', 3);

    const bottleOptions = steps[bottleStepIdx]?.attributes?.[0]?.options ?? [];
    const bottleIdx = bottleOptions.findIndex(o => o.selected);
    const bottleSel = bottleIdx >= 0 ? bottleOptions[bottleIdx] : null;
    console.log("bottleSel", bottleSel);

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

    console.log("liquidSel", liquidSel);
    console.log("closureSel", closureSel);
    console.log("labelSel", labelSel);

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

        try {
          window.parent?.postMessage(
            { customMessageType: 'firstRender', message: { closeLoadingScreen: true } },
            '*' // set a specific origin if you can
          );
        } catch (e) {
          console.error('postMessage failed', e);
        }
      }

      prev.current = isSceneLoading;
    }, [isSceneLoading]);

    // --- UI navigation state (must be declared before effects that depend on them) ---
    const [selectedGroupId, selectGroup] = useState<number | null>(null);
    const [selectedStepId, selectStep] = useState<number | null>(null);
    const [selectedAttributeId, selectAttribute] = useState<number | null>(null);

    const [isSelecting, setIsSelecting] = useState(false);
    const [labelMode, setLabelMode] = useState<'form' | 'guided' | 'upload'>('form');

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
    const [reviewImagesVisible, setReviewImagesVisible] = useState(false);
    const [isPromptGenerating, setIsPromptGenerating] = useState(false);
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

      const isLabelStep = /label|design/i.test(selectedStep?.name || '');

      // If we're NOT on the label step, force "No Selection" so labels stay hidden
      if (!isLabelStep) {
        const active = opts.find(o => !!o?.selected);
        if (active && noSel && active.id !== noSel.id) {
          selectOption(noSel.id);
        }
        return;
      }

      // We ARE on the label step → map bottle -> specific label option by code suffix
      const bottleName = (bottleSel?.name || '').trim().toLowerCase();
      const bottleKey = bottleName.replace(/\s+/g, '_'); // e.g. 'Polo' -> 'polo'

      if (!bottleKey) {
        if (noSel && !noSel.selected) selectOption(noSel.id);
        return;
      }

      const match = opts.find(o => typeof o?.code === 'string' && o.code.toLowerCase().endsWith(`_${bottleKey}`));

      if (match && !match.selected) {
        selectOption(match.id);
        return;
      }

      if (!match && noSel && !noSel.selected) {
        selectOption(noSel.id);
      }
    }, [steps, labelStepIdx, selectedStepId, selectedStep?.name, bottleSel?.name, selectOption]);

    const toMini = (o: any) => (o ? ({ id: o.id, guid: o.guid, name: o.name, selected: !!o.selected }) : null);

    // Keep "No Selection" visible in minis
    const miniBottle  = toMini(bottleSel);
    const miniLiquid  = toMini(liquidSel);
    const miniClosure = toMini(closureSel);
    const miniLabel   = toMini(labelSel);

    console.log("miniBottle", miniBottle);
    console.log("miniLiquid", miniLiquid);
    console.log("miniClosure", miniClosure);
    console.log("miniLabel", miniLabel);

    const {
      setFromSelections,
      labelDesigns,
      setFromUploadDesign,
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
      closureExtras: closureChoices,
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

    console.log("selections", selections)

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

    const visibleAreas = useMemo(() => {
      const areas = product?.areas ?? [];
      if (isSceneLoading || !areas.length || typeof isAreaVisible !== 'function') return [];

      return areas.filter(a => {
        try { return isAreaVisible(a.id); } catch { return false; }
      });
    }, [isSceneLoading, product?.areas, isAreaVisible]);

    const labelAreas = useMemo(() => {
      const byName = (needle: string) =>
      visibleAreas.find(a => (a.name || '').toLowerCase().includes(needle)) || null;

      const front = byName('front');
      const back  = byName('back');

      return { front, back } as const;
    }, [visibleAreas]);

    // Invisible warning helper (logs and stores a message for later UX surfacing)
    const setWarning = (msg: string) => {
      const el = document.getElementById('config-warning');
      if (el) {
        el.textContent = msg;
        el.setAttribute('data-warning', 'true');
      }
      console.warn('[Configurator warning]', msg);
    };

    // A user can "design" only when required selections are made and not "No Selection"
    const canDesign = !!(miniBottle && miniLiquid && miniClosure) &&
      miniBottle.name !== 'No Selection' &&
      miniLiquid.name !== 'No Selection' &&
      miniClosure.name !== 'No Selection';



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


    // (Optional debug) Log selected group/step
    console.log('UI selectedGroupId', selectedGroupId, '->', selectedGroup?.name);
    console.log('UI selectedStepId', selectedStepId, '->', selectedStep?.name);

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
      const onMsg = async (e: MessageEvent) => {
        if (e.data?.customMessageType === 'uploadDesign') {
          console.log("Received uploadDesign message:", e.data.message);

          const { designExport, designSide } = e.data.message || {};
          console.log("designExport", designExport)
          console.log("designSide", designSide)
          if (designSide && designSide !== 'front') return;
          const parentOrder = e.data.message?.order;
          if (designSide) {
            // Persist to zustand so UI flips to "Edit [side] label" and save gating can use it
            setFromUploadDesign({
              order: parentOrder,
              designSide,
              designExport,
            });
            setGuidedGenerating(false);
          }

          // items.forEach(item => {
          //   const itemGuid = item.guid;
          //   removeItem(itemGuid)
          // })

          if (!designSide ) return;

          const bottleName = productObject?.selections?.bottle?.name?.toLowerCase() ?? '';
          const areaName = `${bottleName}_label_${designSide}`;

          const area = product?.areas?.find(a => a.name === areaName);
          if (!area) {
            console.warn('No area found', { areaName });
            return;
          }

          if(designSide === "front") {
            const frontImage = await createImageFromUrl(designExport.s3url);
            // const frontImage = await createImageFromUrl("https://barrel-n-bond.s3.eu-west-2.amazonaws.com/public/Front+Label+for+the+Polo+Bottle+inc+Bleed.jpg");
            // const frontMeshId = getMeshIDbyName(`${productObject?.selections?.bottle?.name.toLowerCase()}_label_front`);
            // console.log("frontMeshId", frontMeshId);

            const frontAreaId = product?.areas.find(a => a.name === productObject?.selections?.bottle?.name.toLowerCase() + '_label_front')?.id;
            // console.log("frontAreaId", frontAreaId);
            
            if (frontImage?.imageID && frontAreaId) {
              await addItemImage(frontImage.imageID, frontAreaId);

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
                  'designSide': designSide,
                  'designExport': designExport,
                  'productSku': product?.sku ?? null,
                }
              });

              window.parent.postMessage({
                customMessageType: 'labelAdded',
                message: {
                  'order': {
                    'bottle': productObject.selections.bottle,
                    'liquid': productObject.selections.liquid,
                    'closure': productObject.selections.closure,
                    'label': productObject.selections.label,
                    'closureExtras': productObject.selections.closureExtras,
                  },
                  'designSide': designSide,
                  'designExport': designExport,
                  'productSku': product?.sku ?? null,
                }
              }, '*');

            }
          
          } else if(designSide === "back") {
            const backImage = await createImageFromUrl(designExport.s3url);
            // const backImage = await createImageFromUrl("https://barrel-n-bond.s3.eu-west-2.amazonaws.com/public/Front+Label+for+the+Polo+Bottle+inc+Bleed.jpg");
  
            // const backMeshId = getMeshIDbyName(`${productObject?.selections?.bottle?.name.toLowerCase()}_label_back`);
            // console.log("backMeshId", backMeshId);
  
            const backAreaId = product?.areas.find(a => a.name === productObject?.selections?.bottle?.name.toLowerCase() + '_label_back')?.id;
  
            // console.log("backAreaId", backAreaId);
  
            if (backImage?.imageID && backAreaId) {
              await addItemImage(backImage.imageID, backAreaId);

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
                  'designSide': designSide,
                  'designExport': designExport,
                  'productSku': product?.sku ?? null,
                }
              });

              window.parent.postMessage({
                customMessageType: 'labelAdded',
                message: {
                  'order': {
                    'bottle': productObject.selections.bottle,
                    'liquid': productObject.selections.liquid,
                    'closure': productObject.selections.closure,
                    'label': productObject.selections.label,
                    'closureExtras': productObject.selections.closureExtras,
                  },
                  'designSide': designSide,
                  'designExport': designExport,
                  'productSku': product?.sku ?? null,
                }
              }, '*');

            }
          }
        }
        if (e.data?.customMessageType === 'generateLabelPromptResult') {
          const prompt = e.data?.message?.prompt || '';
          if (prompt) {
            setPromptOverride(prompt);
          }
          setIsPromptGenerating(false);
        }
        if (e.data?.customMessageType === 'generateLabelPromptError') {
          const fallback = assemblePrompt();
          if (fallback) {
            setPromptOverride(fallback);
          }
          setIsPromptGenerating(false);
        }
      };
      window.addEventListener('message', onMsg);
      return () => window.removeEventListener('message', onMsg);
    }, [createImageFromUrl, getMeshIDbyName, addItemImage, removeItem, items, productObject?.selections?.bottle?.name, product?.areas, setCameraByName, setFromUploadDesign]);


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


    // useEffect(() => {
    //   const sendHeight = () => {
    //     const h = Math.max(
    //       document.documentElement.scrollHeight,
    //       document.body?.scrollHeight || 0
    //     );
    //     window.parent.postMessage(
    //       { customMessageType: 'CONFIG_IFRAME_HEIGHT', height: h },
    //       '*'
    //     );
    //   };

    //   // observe size changes
    //   const ro = new ResizeObserver(() => sendHeight());
    //   ro.observe(document.documentElement);

    //   // initial + on load
    //   sendHeight();
    //   window.addEventListener('load', sendHeight);

    //   // on orientation changes
    //   window.addEventListener('orientationchange', () => setTimeout(sendHeight, 250));

    //   return () => {
    //     ro.disconnect();
    //     window.removeEventListener('load', sendHeight);
    //   };
    // }, []);

    // === Camera animation: refs & helpers (top-level inside component) ===
    const camAbort = useRef<AbortController | null>(null);
    const lastCamRef = useRef<string | null>(null);
    const isAnimatingCam = useRef(false);
    const prevTourKeyRef = useRef<string | null>(null);

    const waitSceneIdle = async (timeout = 1500, interval = 60) => {
      const start = Date.now();
      let stable = 0;
      while (Date.now() - start < timeout) {
        if (!isSceneLoading) {
          stable++;
          if (stable >= 2) break;
        } else {
          stable = 0;
        }
        await new Promise(r => setTimeout(r, interval));
      }
      await new Promise(r => requestAnimationFrame(() => r(null)));
    };

    const moveCamera = async (name: string) => {
      try {
        await setCameraByName(name);
        lastCamRef.current = name;
      } catch {}
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
          await new Promise(r => setTimeout(r, perFrameMs));
        }
        if (!ctrl.signal.aborted) await moveCamera(final);
      } finally {
        if (camAbort.current === ctrl) camAbort.current = null;
        isAnimatingCam.current = false;
      }
    };

    // Fire tour on step / bottle change, but debounce identical requests
    useEffect(() => {
      if (!selectedStep) return;

      // current step key
      const s = (selectedStep.name || '').toLowerCase();
      const stepKey: 'bottle' | 'liquid' | 'closure' | 'label' =
        s.includes('bottle') ? 'bottle' :
        s.includes('closure') ? 'closure' :
        s.includes('liquid')   ? 'liquid'   : 'label';

      // derive bottle key from current bottle selection (e.g. "Antica" -> "antica")
      const bottleKey = (bottleSel?.name || selections.bottle?.name || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');

      // if no bottle yet, skip anim
      if (!bottleKey) return;

      // build dynamic camera names based on your convention
      const cams: Record<'full_front'|'full_side'|'closure'|'label_front'|'label_back', string> = {
        full_front: `${bottleKey}_full_front`,
        full_side: `${bottleKey}_full_side`,
        closure: `${bottleKey}_closure`,
        label_front: `${bottleKey}_label_front`,
        label_back: `${bottleKey}_label_back`,
      };

      // choose keyframe path for a short orbit feel per step
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
        final = cams.label_front;
      } else if (stepKey === 'label') {
        frames = ['wide_high_front'];
        const preferFront = !!labelAreas.front || !labelAreas.back;
        final = preferFront ? cams.label_front : cams.label_back;
      }

      const tourKey = `${stepKey}|${bottleKey}|${final}`;
      if (!isSceneLoading && prevTourKeyRef.current === tourKey) {
        return; // identical request, skip to avoid jitter
      }
      prevTourKeyRef.current = tourKey;

      (async () => {
        await waitSceneIdle(1500, 60); // wait for model/meshes swap to settle
        await runCameraTour(frames, final, 1000); // adjust per-frame ms as desired
      })();

      return () => camAbort.current?.abort();
    }, [
      selectedStep?.id,
      selections.bottle?.name,
      bottleSel?.name,
      labelAreas.front?.id,
      labelAreas.back?.id,
      isSceneLoading
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

    // Utility: wait for a predicate to become true with timeout (helps with Zakeke async UI updates)
    const waitFor = (predicate: () => boolean, timeout = 2500, interval = 50) =>
      new Promise<boolean>((resolve) => {
        const start = Date.now();
        const tick = () => {
          let ok = false;
          try { ok = !!predicate(); } catch {}
          if (ok) return resolve(true);
          if (Date.now() - start >= timeout) return resolve(false);
          setTimeout(tick, interval);
        };
        tick();
      });

    // --- Helper: ensure atomic update for closure selection ---
    const selectOptionOnAttribute = async (
      attributeId: number | null,
      optionId: number | null
    ) => {
      if (!attributeId || !optionId || isSelecting) return;

      setIsSelecting(true);
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
            await waitFor(() => selectedStepId === closureStep.id, 2000, 40);
          }
        }

        if (selectedAttributeId !== attrId) {
          selectAttribute(attrId);
          await waitFor(() => selectedAttributeId === attrId, 2000, 40);
        }

        // Select the option and confirm
        selectOption(optId);
        const ok = await waitFor(() => {
          const activeAttr = attributes.find(a => a.id === (selectedAttributeId ?? -1));
          const opts = activeAttr?.options || [];
          return !!opts.find(o => o.id === optId && o.selected);
        }, 1500, 40);

        if (!ok) {
          await new Promise(r => setTimeout(r, 60));
          selectOption(optId);
          await waitFor(() => {
            const activeAttr = attributes.find(a => a.id === (selectedAttributeId ?? -1));
            const opts = activeAttr?.options || [];
            return !!opts.find(o => o.id === optId && o.selected);
          }, 2000, 40);
        }

        // === Atomic commit to store ===
        const step = steps[closureStepIdx];
        let attr = Array.isArray(step?.attributes) ? step!.attributes.find((a: any) => !!a?.enabled) : null;
        if (!attr && selectedAttributeId != null) {
          attr = step?.attributes?.find((a: any) => a?.id === selectedAttributeId) || null;
        }
        if (!attr) {
          const attrs: any[] = Array.isArray(step?.attributes) ? step!.attributes : [];
          attr = (bottleIdx >= 0 ? attrs[bottleIdx] : null) || attrs[0] || null;
        }
        const latestClosureSel = Array.isArray(attr?.options) ? attr!.options.find((o: any) => !!o?.selected) || null : null;

        const latestBottleSel = bottleSel;
        const latestLiquidSel = liquidSel;
        const latestLabelSel  = labelSel;

        const latestSelections = {
          bottleSel: latestBottleSel,
          liquidSel: latestLiquidSel,
          closureSel: latestClosureSel,
          labelSel: latestLabelSel,
          bottle: latestBottleSel ? { id: latestBottleSel.id, guid: latestBottleSel.guid, name: latestBottleSel.name, selected: !!latestBottleSel.selected } : null,
          liquid: latestLiquidSel ? { id: latestLiquidSel.id, guid: latestLiquidSel.guid, name: latestLiquidSel.name, selected: !!latestLiquidSel.selected } : null,
          closure: latestClosureSel ? { id: latestClosureSel.id, guid: latestClosureSel.guid, name: latestClosureSel.name, selected: !!latestClosureSel.selected } : null,
          label: latestLabelSel ? { id: latestLabelSel.id, guid: latestLabelSel.guid, name: latestLabelSel.name, selected: !!latestLabelSel.selected } : null,
        } as const;

        setFromSelections({ selections: latestSelections as any, sku: product?.sku ?? null, price });
      } finally {
        // small delay to avoid rapid double-clicks
        setTimeout(() => setIsSelecting(false), 120);
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

    const handleUploadLabelLater = () => {
      console.log("postMessage content:", {
        customMessageType: 'uploadLabelLater',
        message: { designSide: 'front' },
      });
      
      window.parent.postMessage(
        {
          customMessageType: 'uploadLabelLater',
          message: { designSide: 'front' },
        },
        '*'
      );
    };

    const handleUploadLabelSubmit = async () => {
      if (!uploadLabelFile) return;
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
          file: uploadLabelFile, 
          dataUrl 
        },
      });

      window.parent.postMessage(
        {
          customMessageType: 'customLabelUploaded',
          message: { 
            designSide: 'front', 
            file: uploadLabelFile, 
            dataUrl 
          },
        },
        '*'
      );
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

    const handleGenerateLabel = async () => {
      if (!canDesign) {
        setWarning('Please select a bottle, liquid, and closure before designing labels.');
        return;
      }
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

      const includeHexes = !!(labelForm.primaryColor || labelForm.secondaryColor);
      const subtitle = (miniLiquid?.name || '').trim();
      const payload: any = {
        designSide: 'front',
        alcoholName: subtitle,
        bottleName: (miniBottle?.name || '').trim(),
        liquidName: (miniLiquid?.name || '').trim(),
        closureName: (miniClosure?.name || '').trim(),
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
      window.parent.postMessage(
        {
          messageContent: 'generateLabelImage',
          message: payload,
        },
        '*'
      );
    };

    const handleSendRevision = (critique: string) => {
      const trimmed = (critique || '').trim();
      if (!trimmed) {
        setWarning('Please enter revision notes.');
        return;
      }
      const prev = labelDesigns?.front || null;
      const previousImage =
        prev?.frontS3Url || prev?.s3url || prev?.url || (Array.isArray(prev?.images) ? prev.images[0] : '') || '';
      if (!previousImage) {
        setWarning('No previous label image found to revise.');
        return;
      }
      const payload = {
        designSide: 'front',
        alcoholName: (miniLiquid?.name || '').trim(),
        bottleName: (miniBottle?.name || '').trim(),
        liquidName: (miniLiquid?.name || '').trim(),
        closureName: (miniClosure?.name || '').trim(),
        previousImage,
        critique: trimmed,
        sessionId: sessionStorage.getItem('ss_session_id') || (window as any).SS?.getSessionId?.() || String(Date.now()),
      };
      console.log("postMessage Content:", {
        messageContent: 'generateLabelRevision',
        message: payload,
      })

      window.parent.postMessage(
        { messageContent: 'generateLabelRevision', 
          message: payload },
        '*'
      );
    };

    const handleGeneratePromptViaShopify = () => {
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

      window.parent.postMessage(
        {
          messageContent: 'generateLabelPrompt',
          message: payload,
        },
        '*'
      );

    };

    const handleLabelClick = (side: 'front') => {
      if (!canDesign) {
        setWarning('Please select a bottle, liquid, and closure before designing labels.');
        return;
      }
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

      window.parent.postMessage({
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
      }, '*');
    };    

    const handleLearnClick = (side?: 'front' | 'back') => {

      console.log("postMessage Content:", {
        customMessageType: 'OpenDesignerHelp',
        message: {
          ...(side ? { side } : {}),
          productSku: product?.sku ?? null,
        }
      });

      window.parent.postMessage({
        customMessageType: 'OpenDesignerHelp',
        message: {
          ...(side ? { side } : {}),
          productSku: product?.sku ?? null,
        }
      }, '*');
    };
    

    if (isSceneLoading || !groups || groups.length === 0)
        return <LoadingSpinner />;
    
    const handleAddToCart = async () => {
    try {
        await addToCart(
            {},
            async (data) => {
                console.log("data", data);

                console.log("postMessage Content:", {
                    customMessageType: "AddToCart",
                    message: {
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
                    }
                }
                )

                window.parent.postMessage({
                    customMessageType: "AddToCart",
                    message: {
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
                    }
                }, "*");

                return data;
            },
            false 
        );
    } catch (error) {
        console.error('Error during addToCart:', error);
    }
};

    const frontLabelDesigned = Boolean(labelDesigns.front);
    const showAddToCartButton = productObject.valid && frontLabelDesigned;

    return (
      <>
        <ConfigWarning />
        <LayoutWrapper>
        <ContentWrapper>
          <Container>
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
                      setWarning('Please select a bottle, liquid, and closure (not "No Selection") before designing labels.');
                      return;
                    }
                    selectStep(nextStep.id);
                  }
                }}
                disablePrev={selectedGroup.steps.findIndex(s => s.id === selectedStep.id) === 0}
                disableNext={
                  selectedGroup.steps.findIndex(s => s.id === selectedStep.id) === selectedGroup.steps.length - 1 ||
                  ((isBottleStep || isLiquidStep || isClosureStep) && !hasValidSelection)
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
                  <SectionTitle>Choose Your Wood</SectionTitle>
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
                          title={s.key}
                        />
                      );
                    })}
                  </SwatchGrid>
                </div>

                {/* Wax section */}
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
                          title={s.key}
                        >
                          {isNone && (<SwatchNoneLabel>None</SwatchNoneLabel>)}
                        </SwatchButton>
                      );
                    })}
                  </SwatchGrid>
                </div>
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
                  ) : (
                    <ActionsCenter>
                      <RestartButton
                        type="button"
                        onClick={() => {
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
                        aria-label="Restart form"
                        title="Restart"
                      >
                        <span className="material-symbols-outlined">replay</span>
                      </RestartButton>
                    </ActionsCenter>
                  )}

                <LabelForm onSubmit={(event) => event.preventDefault()}>
                  {labelMode === 'form' ? (
                    <LabelField>
                      Title
                      <LabelInput
                        type="text"
                        value={labelForm.title}
                        onChange={handleLabelFieldChange('title')}
                        placeholder="e.g. Barrel & Bond"
                      />
                    </LabelField>
                  ) : null}

                  {labelMode === 'form' && (
                    <LabelField>
                      Describe your label
                      <LabelTextarea
                        value={labelForm.prompt}
                        onChange={handleLabelFieldChange('prompt')}
                        placeholder="Describe the mood, style, and motifs you want."
                      />
                    </LabelField>
                  )}

                  {labelMode === 'guided' && guidedGenerating && (
                    <ActionsCenter>
                      <div>
                        <div style={{ textAlign: 'center', marginBottom: 12 }}>Designing Your Label</div>
                        <LoadingSpinner />
                      </div>
                    </ActionsCenter>
                  )}

                  {labelMode === 'guided' && !guidedGenerating && (
                    <WizardWrap>
                      {!wizardStarted ? (
                        <>
                          <LabelField>
                            Title
                            <LabelInput
                              type="text"
                              value={labelForm.title}
                              onChange={handleLabelFieldChange('title')}
                              placeholder="e.g. Barrel & Bond"
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
                                  <WizardHeaderSide>
                                    <button
                                      className="configurator-button"
                                      type="button"
                                      onClick={goPrev}
                                      disabled={wizardStepIndex === 0}
                                    >
                                      Back
                                    </button>
                                  </WizardHeaderSide>
                                  <WizardStepTitle>{currentStep.title}</WizardStepTitle>
                                  <WizardHeaderSide $align="right">
                                    {currentStep.review ? (
                                      <button
                                        className="configurator-button"
                                        type="button"
                                        disabled={!!(labelForm.logoFile || labelForm.characterFile) && !labelForm.hasCharacterPermission}
                                        onClick={async () => {
                                          setGuidedPromptConfirmed(true);
                                          setGuidedGenerating(true);
                                          await handleGenerateLabel();
                                        }}
                                      >
                                        Confirm &amp; Generate
                                      </button>
                                    ) : (
                                      !hasSelection ? (
                                        <button
                                          className="configurator-button"
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
                                          {currentStep.key === 'logo' ? 'Skip and Generate Prompt' : 'Skip'}
                                        </button>
                                      ) : (
                                        <button
                                          className="configurator-button"
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
                                          {currentStep.key === 'logo' ? 'Generate Prompt' : 'Next'}
                                        </button>
                                      )
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
                                  Generating prompt…
                                </PromptLoading>
                              ) : (
                                <>
                                  <LabelField>
                                    Title
                                    <LabelInput
                                      type="text"
                                      value={labelForm.title}
                                      onChange={handleLabelFieldChange('title')}
                                      placeholder="e.g. Barrel & Bond"
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
                                    <LabelRow>
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
                                    </LabelRow>
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
                                      I have the express permission/right to use any logo, or any image with the likeness of a person/character being uploaded for commercial purposes
                                    </LabelCheckboxRow>
                                  )}
                                </>
                              )
                            )}
                            {currentStep.key === 'paletteVibe' && labelWizard.paletteVibe === 'Pick my own' && (
                              <LabelRow>
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
                              </LabelRow>
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
                                  Upload a photo of a person/character to include in your label design.
                                </LabelDescription>
                                <LabelHelperText>
                                  {labelForm.characterFile?.name || 'No character uploaded.'}
                                </LabelHelperText>
                              </LabelField>
                            )}
                          </>
                        );
                      })()
                      )}
                    </WizardWrap>
                  )}

                  {labelMode === 'upload' && (
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

                  {labelMode === 'form' && (
                    <LabelDetails>
                      <LabelSummary>
                        Select colours
                        <LabelSummaryMeta>Optional</LabelSummaryMeta>
                      </LabelSummary>
                      <LabelRow>
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
                      </LabelRow>
                    </LabelDetails>
                  )}

                  {labelMode === 'form' && (
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
                            Upload a photo of a person/character to include in your label design.
                          </LabelDescription>
                          <LabelHelperText>
                            {labelForm.characterFile?.name || 'No character uploaded.'}
                          </LabelHelperText>
                        </LabelField>
                      </LabelRow>
                    </LabelDetails>
                  )}


                  {labelMode === 'form' && (
                    <ActionsCenter>
                      <button
                        className="configurator-button"
                        disabled={!canDesign || (!!(labelForm.logoFile || labelForm.characterFile) && !labelForm.hasCharacterPermission)}
                        title={
                          !canDesign
                            ? 'Select bottle, liquid, and closure first'
                            : ((labelForm.logoFile || labelForm.characterFile) && !labelForm.hasCharacterPermission)
                              ? 'Confirm you have permission to use the uploaded files'
                              : undefined
                        }
                        type="button"
                        onClick={handleGenerateLabel}
                      >
                        Generate Label
                      </button>
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
