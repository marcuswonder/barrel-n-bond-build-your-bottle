import React, { FunctionComponent, useEffect, useMemo, useRef, useState } from 'react';
// import styled from 'styled-components';
import { useZakeke } from 'zakeke-configurator-react';
import { LayoutWrapper, ContentWrapper, Container,  StepTitle, OptionListItem, RotateNotice, NavButton, PriceWrapper, CartButton, LoadingSpinner } from './list';
// import { List, StepListItem, , ListItemImage } from './list';
import { optionNotes } from '../data/option-notes';
import { TailSpin } from 'react-loader-spinner';
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
        product,
        items,
        getMeshIDbyName,
        isAreaVisible,
        createImageFromUrl, 
        addItemImage,
        setCameraByName,
        removeItem,
        // templates,
        // setTemplate,
        // setMeshDesignVisibility,
        // restoreMeshVisibility,
    } = useZakeke();

    
    console.log("groups", groups)
    console.log("product", product)
    console.log("items", items)
    
    const isApplyingSelectionRef = useRef(false);

    const buildGroup = groups.find(g => g.name === "Build Your Bottle") ?? null;

    const steps = buildGroup?.steps ?? [];

  
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

      // For the Closure step: prefer enabled attribute, then the actively selected attribute,
      // then fall back to bottle-index mapping for legacy layouts
      if (stepIdx === closureStepIdx) {
        const attrs: any[] = Array.isArray(step.attributes) ? step.attributes : [];

        // 1) enabled attr first
        let attr = attrs.find(a => !!a?.enabled) || null;

        // 2) if none flagged enabled, try the currently selected attribute in the UI
        if (!attr && selectedAttributeId != null) {
          attr = attrs.find(a => a?.id === selectedAttributeId) || null;
        }

        // 3) final fallbacks to avoid nulls
        if (!attr) attr = (bottleIdx >= 0 ? attrs[bottleIdx] : null) || attrs[0] || null;

        const opts: any[] = Array.isArray(attr?.options) ? attr!.options : [];
        return opts.find(o => o?.selected) || null;
      }

      // All other steps can keep bottle-index mapping
      return bottleIdx >= 0
        ? step.attributes?.[bottleIdx]?.options?.find(o => o.selected) ?? null
        : null;
    };

    const liquidSel  = pick(liquidStepIdx);
    const closureSel = pick(closureStepIdx);
    const labelSel   = pick(labelStepIdx);

    console.log("liquidSel", liquidSel);
    console.log("closureSel", closureSel);
    console.log("labelSel", labelSel);

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

    // Key that only changes when meaningful order fields change
    const orderKey = [
      product?.sku ?? '',
      String(price ?? ''),
      selections.bottle?.id ?? 0,
      selections.liquid?.id ?? 0,
      selections.closure?.id ?? 0,
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

    const [selectedGroupId, selectGroup] = useState<number | null>(null);
    const [selectedStepId, selectStep] = useState<number | null>(null);
    const [selectedAttributeId, selectAttribute] = useState<number | null>(null);


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

    const selectedGroup = groups.find(group => group.id === selectedGroupId);
    const selectedStep = selectedGroup?.steps.find(step => step.id === selectedStepId) ?? null;

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
          const parentOrder = e.data.message?.order;
          if (designSide) {
            // Persist to zustand so UI flips to "Edit [side] label" and save gating can use it
            setFromUploadDesign({
              order: parentOrder,
              designSide,
              designExport,
            });
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
            }
          }
        }
      };
      window.addEventListener('message', onMsg);
      return () => window.removeEventListener('message', onMsg);
    }, [createImageFromUrl, getMeshIDbyName, addItemImage, removeItem, items, productObject?.selections?.bottle?.name, product?.areas, setCameraByName, setFromUploadDesign]);


    



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

    // --- Helper: ensure we are on the attribute that owns the option, then select the option ---
    // 3) wrap your programmatic selection so we don't emit transient state
    const selectOptionOnAttribute = async (attributeId: number | null, optionId: number | null) => {
      if (!attributeId || !optionId) return;

      isApplyingSelectionRef.current = true;
      try {
        const attrId = Number(attributeId);
        const optId  = Number(optionId);
        if (!Number.isFinite(attrId) || !Number.isFinite(optId)) return;

        // (your existing logic)
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

        selectOption(optId);
        const ok = await waitFor(() => {
          const activeAttr = attributes.find(a => a.id === (selectedAttributeId ?? -1));
          const opts = activeAttr?.options || [];
          return !!opts.find(o => o.id === optId && o.selected);
        }, 2000, 40);

        if (!ok) {
          await new Promise(r => setTimeout(r, 60));
          selectOption(optId);
          await waitFor(() => {
            const activeAttr = attributes.find(a => a.id === (selectedAttributeId ?? -1));
            const opts = activeAttr?.options || [];
            return !!opts.find(o => o.id === optId && o.selected);
          }, 2000, 40);
        }
      } finally {
        // release AFTER Zakeke confirms selection
        isApplyingSelectionRef.current = false;
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

    useEffect(() => {
      if (!onLabelStep || !selectedAttribute) return;

      const opts = selectedAttribute.options || [];
      const designOpt = opts.find(
        o => (o.name || '').toLowerCase().includes('design your label')
      );

      // Only trigger if it's not already selected
      if (designOpt && !designOpt.selected) {
        selectOption(designOpt.id);
      }
    }, [onLabelStep, selectedAttribute, selectOption]);

    const frontVisible = !!labelAreas.front;
    const backVisible  = !!labelAreas.back;

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

    const getOptionIdByName = (name: string) => {
      const needle = (name || '').trim().toLowerCase();
      const hit = closureOptions.find(o => (o.name || '').trim().toLowerCase() === needle);
      return hit?.id ?? null;
    };

    const handleLabelClick = (side: 'front' | 'back') => {
      if (!canDesign) {
        setWarning('Please select a bottle, liquid, and closure (not "No Selection") before designing labels.');
        return;
      }
      const hasDesign = side === 'front' ? !!labelDesigns.front : !!labelDesigns.back;
      const designType = hasDesign ? 'edit' : 'design';
      const designId = side === 'front'
        ? ((labelDesigns as any)?.front?.id ?? null)
        : ((labelDesigns as any)?.back?.id  ?? null);

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
    };    

    const handleLearnClick = (side?: 'front' | 'back') => {
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

    const hasFront = !frontVisible || !!labelDesigns.front;
    const hasBack  = !backVisible  || !!labelDesigns.back;
    const showAddToCartButton = productObject.valid && hasFront && hasBack;

    return (
      <>
        <RotateNotice>Please rotate your device to landscape for the best experience.</RotateNotice>
        <div id="config-warning" aria-live="polite" style={{ display: 'none' }} />
        <LayoutWrapper>
        <ContentWrapper>
          <Container>
            {/* Step Navigation */}
            {selectedGroup && selectedGroup.steps.length > 0 && selectedStep && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '16px 0' }}>
                <NavButton
                  onClick={() => {
                    const currentIndex = selectedGroup.steps.findIndex(s => s.id === selectedStep.id);
                    if (currentIndex > 0) selectStep(selectedGroup.steps[currentIndex - 1].id);
                  }}
                  disabled={selectedGroup.steps.findIndex(s => s.id === selectedStep.id) === 0}
                  title="Back"
                >
                  ←
                </NavButton>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <StepTitle>{selectedStep.name}</StepTitle>
                  <span style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                    Step {selectedGroup.steps.findIndex(s => s.id === selectedStep.id) + 1} of {selectedGroup.steps.length}
                  </span>
                </div>

                <NavButton
                  onClick={() => {
                    const currentIndex = selectedGroup.steps.findIndex(s => s.id === selectedStep.id);
                    if (currentIndex < selectedGroup.steps.length - 1) {
                      // Do not allow moving past Bottle, Liquid, or Closure without a valid selection
                      if ((isBottleStep || isLiquidStep || isClosureStep) && !hasValidSelection) {
                        const which = isBottleStep ? 'bottle' : isLiquidStep ? 'liquid' : 'closure';
                        setWarning(`Please select a ${which} option (not "No Selection") to continue.`);
                        return;
                      }

                      const nextStep = selectedGroup.steps[currentIndex + 1];
                      const isLabelish = /label|design/i.test(nextStep?.name || '');
                      if (isLabelish && !canDesign) {
                        setWarning('Please select a bottle, liquid, and closure (not "No Selection") before designing labels.');
                        return;
                      }
                      selectStep(nextStep.id);
                    }
                  }}
                  disabled={
                    selectedGroup.steps.findIndex(s => s.id === selectedStep.id) === selectedGroup.steps.length - 1 ||
                    ((isBottleStep || isLiquidStep || isClosureStep) && !hasValidSelection)
                  }
                  title="Next"
                >
                  →
                </NavButton>
              </div>
            )}

            {/* Options */}
            {/* Options (hidden on label step) */}
            {/* Options / Custom rendering for Closure step */}
            {!onLabelStep && !isClosureStep && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
                {selectedAttribute?.options
                  .filter(() => true)
                  .map(option => (
                    option.name !== "No Selection" && (
                      <OptionListItem
                        key={option.id}
                        onClick={() => {
                          console.log('User selected option:', {
                            name: option.name,
                            attribute: selectedAttribute.name,
                            enabled: option.enabled,
                            selected: option.selected
                          });
                          selectOption(option.id);
                        }}
                        selected={option.selected}
                        style={{
                          width: '200px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease-in-out',
                          boxShadow: option.selected ? '0 0 0 2px black' : 'none',
                          border: option.selected ? '2px solid #222' : '1px solid #ddd',
                          borderRadius: '8px',
                          background: option.selected ? '#f3f3fa' : '#fff',
                          outline: 'none'
                        }}
                        tabIndex={0}
                        onMouseOver={e => {
                          (e.currentTarget as HTMLElement).style.boxShadow = option.selected
                            ? '0 0 0 2.5px #333'
                            : '0 2px 8px rgba(0,0,0,0.07)';
                        }}
                        onMouseOut={e => {
                          (e.currentTarget as HTMLElement).style.boxShadow = option.selected
                            ? '0 0 0 2px black'
                            : 'none';
                        }}
                        onFocus={e => {
                          (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 2.5px #0074d9';
                        }}
                        onBlur={e => {
                          (e.currentTarget as HTMLElement).style.boxShadow = option.selected
                            ? '0 0 0 2px black'
                            : 'none';
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: option.selected ? '#000' : undefined }}>{option.name}</span>
                          {selectedStep?.name === "Select your Gin" && option.description && (
                            <span style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                              {option.description}
                            </span>
                          )}
                        </div>
                      </OptionListItem>
                    )
                  ))}
              </div>
            )}

            {(!onLabelStep && isClosureStep) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 8 }}>
                {/* Wood section */}
                <div>
                  <h4 style={{ margin: '0 0 8px' }}>Choose Your Wood</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: 12 }}>
                    {WOOD_SWATCHES.map(s => {
                      const selected = closureChoices?.wood?.hex === s.hex;
                      return (
                        <button
                          key={s.key}
                          aria-label={s.key}
                          onClick={() => onPickWood(s.key, s.hex)}
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            border: selected ? '3px solid #000' : '1px solid #ccc',
                            background: s.hex,
                            cursor: 'pointer'
                          }}
                          title={s.key}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Wax section */}
                <div>
                  <h4 style={{ margin: '0 0 8px' }}>Choose a Wax Colour</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: 12 }}>
                    {WAX_SWATCHES.map(s => {
                      const isNone = s.key === 'No Wax Seal';
                      const selected = isNone ? !closureChoices?.wax : closureChoices?.wax?.hex === s.hex;
                      return (
                        <button
                          key={s.key}
                          aria-label={s.key}
                          onClick={() => onPickWax(s.key, s.hex)}
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            border: selected ? '3px solid #000' : '1px solid #ccc',
                            background: isNone ? 'transparent' : s.hex,
                            position: 'relative',
                            cursor: 'pointer'
                          }}
                          title={s.key}
                        >
                          {isNone && (
                            <span style={{
                              position: 'absolute',
                              inset: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              color: '#555'
                            }}>None</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {onLabelStep && (frontVisible || backVisible) && (
              <>
                <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr', marginTop: 16 }}>
                  {frontVisible && (
                    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
                      <h4 style={{ marginTop: 0 }}>Front Label</h4>
                      <button
                        className="configurator-button"
                        disabled={!canDesign}
                        title={!canDesign ? 'Select bottle, liquid, and closure first' : undefined}
                        onClick={() => handleLabelClick('front')}
                      >
                        {labelDesigns.front ? 'Edit Front Label' : 'Design Front Label'}
                      </button>
                    </div>
                  )}
                  {backVisible && (
                    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
                      <h4 style={{ marginTop: 0 }}>Back Label</h4>
                      <button
                        className="configurator-button"
                        disabled={!canDesign}
                        title={!canDesign ? 'Select bottle, liquid, and closure first' : undefined}
                        onClick={() => handleLabelClick('back')}
                      >
                        {labelDesigns.back ? 'Edit Back Label' : 'Design Back Label'}
                      </button>
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
                  <button className="configurator-button" onClick={() => handleLearnClick()}>
                    Learn How to Use Our Designer
                  </button>
                </div>
              </>
            )}

            {(() => {
              const stepName = (selectedStep?.name || '').toLowerCase();
              const notesAllowed = /bottle|gin|liquid/.test(stepName);
              return notesAllowed && selectedStep?.name && selectedAttribute && selectedAttribute.options.find(opt => opt.selected && opt.name !== "No Selection");
            })() && (
              <div style={{ marginTop: '24px', padding: '16px', background: '#f9f9f9', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <strong>Notes</strong>
                <p style={{ margin: '8px 0 0', color: '#555' }}>
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
              </div>
            )}
          </Container>
        </ContentWrapper>
        <div style={{ position: 'sticky', bottom: 0, background: '#fff', padding: '16px 16px 24px', borderTop: '1px solid #ccc', zIndex: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ margin: 0 }}>Price: {price}</h3>
            {showAddToCartButton && (
              <CartButton onClick={handleAddToCart}>
                {isAddToCartLoading
                  ? <TailSpin color="#FFFFFF" height="25px" />
                  : <span>Save and Order</span>}
              </CartButton>
            )}
          </div>
        </div>
        </LayoutWrapper>
      </>
    );
};

export default Selector;

