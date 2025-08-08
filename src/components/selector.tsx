import React, { FunctionComponent, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useZakeke } from 'zakeke-configurator-react';
import { LayoutWrapper, ContentWrapper, Container,  StepTitle, OptionListItem, RotateNotice, NavButton, PriceWrapper, CartButton, LoadingSpinner } from './list';
// import { List, StepListItem, , ListItemImage } from './list';
import { optionNotes } from '../data/option-notes';
import { TailSpin } from 'react-loader-spinner';

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
        // templates,
        // setTemplate,
        // createImageFromUrl, 
        // addItemImage,
        // setMeshDesignVisibility,
        // restoreMeshVisibility,
    } = useZakeke();

    
    console.log("groups", groups)
    console.log("product", product)
    console.log("items", items)
    
    // --- Selections (memoised & guarded) ---
    const buildGroup = useMemo(() => groups.find(g => g.name === "Build Your Bottle") ?? null, [groups]);

    const selections = useMemo(() => {
      const steps = buildGroup?.steps ?? [];

      // Step lookup by name fallback (avoids magic indices if ordering changes)
      const findStepIndex = (needle: string, fallbackIndex: number) => {
        const i = steps.findIndex(s => s.name?.toLowerCase().includes(needle));
        return i >= 0 ? i : fallbackIndex;
      };

      const bottleStepIdx = findStepIndex('bottle', 0);
      const liquidStepIdx = findStepIndex('gin', 1);     // your step is named "Select your Gin"
      const closureStepIdx = findStepIndex('closure', 2);
      const labelStepIdx = findStepIndex('label', 3);

      const bottleOptions = steps[bottleStepIdx]?.attributes?.[0]?.options ?? [];
      const bottleIdx = bottleOptions.findIndex(o => o.selected);
      const bottleSel = bottleIdx >= 0 ? bottleOptions[bottleIdx] : null;
      console.log("bottleSel", bottleSel)

      const pick = (stepIdx: number) => (
        bottleIdx >= 0
          ? steps[stepIdx]?.attributes?.[bottleIdx]?.options?.find(o => o.selected) ?? null
          : null
      );

      const liquidSel  = pick(liquidStepIdx);
      const closureSel = pick(closureStepIdx);
      const labelSel   = pick(labelStepIdx);

      console.log("liquidSel", liquidSel)
      console.log("closureSel", closureSel)
      console.log("labelSel", labelSel)

      const toMini = (o: any) => o ? ({ id: o.id, guid: o.guid, name: o.name, selected: !!o.selected }) : null;
      const scrubNoSel = (o: any) => (o?.name === 'No Selection' ? null : o);

      const miniBottle  = toMini(bottleSel);
      const miniLiquid  = toMini(scrubNoSel(liquidSel));
      const miniClosure = toMini(scrubNoSel(closureSel));
      const miniLabel   = toMini(scrubNoSel(labelSel));

      console.log("miniBottle", miniBottle)
      console.log("miniLiquid", miniLiquid)
      console.log("miniClosure", miniClosure)
      console.log("miniLabel", miniLabel)

      return {
        bottleSel,
        liquidSel,
        closureSel,
        labelSel,
        bottle: miniBottle,
        liquid: miniLiquid,
        closure: miniClosure,
        label: miniLabel,
      } as const;
    }, [buildGroup]);

    const [labelDesigns, setLabelDesigns] = useState<{ front: string | null; back: string | null }>({
      front: null,
      back: null,
    });

    const productObject = useMemo(() => {
      const bottleName = selections.bottleSel?.name?.toLowerCase() || '';
      const frontMeshId = bottleName ? getMeshIDbyName(`${bottleName}_label_front`) : null;
      const backMeshId  = bottleName ? getMeshIDbyName(`${bottleName}_label_back`)  : null;

      const valid = !!(selections.bottle && selections.liquid && selections.closure);

      return {
        sku: product?.sku ?? null,
        price,
        selections: {
          bottle: selections.bottle,
          liquid: selections.liquid,
          closure: selections.closure,
          label: selections.label,
          // carry VistaCreate design IDs for edit flow
          frontDesignId: labelDesigns.front,
          backDesignId: labelDesigns.back,
        },
        mesh: { frontMeshId, backMeshId },
        valid,
      } as const;
    }, [price, product?.sku, selections, getMeshIDbyName, labelDesigns.front, labelDesigns.back]);

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

    const [selectedGroupId, selectGroup] = useState<number | null>(null);
    const [selectedStepId, selectStep] = useState<number | null>(null);
    const [selectedAttributeId, selectAttribute] = useState<number | null>(null);


    // Initialize group/step/attribute once groups are available
    useEffect(() => {
      if (!groups || groups.length === 0) return;
      if (selectedGroupId !== null && selectedStepId !== null && selectedAttributeId !== null) return;

      const bottleGroup = groups.find(g => g.name === 'Build Your Bottle') || groups[0];
      selectGroup(prev => (prev === null ? bottleGroup.id : prev));

      const firstStep = bottleGroup.steps?.[0] || null;
      if (firstStep) {
        selectStep(prev => (prev === null ? firstStep.id : prev));
      }

      const attrs = (firstStep || bottleGroup)?.attributes || [];
      const firstEnabledAttr = attrs.find(a => a.enabled) || attrs[0];
      if (firstEnabledAttr) {
        selectAttribute(prev => (prev === null ? firstEnabledAttr.id : prev));
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
      console.log('frontMeshId', mesh.frontMeshId);
      console.log('backMeshId', mesh.backMeshId);
    }, [productObject]);


    useEffect(() => {
      const onMsg = (e: MessageEvent) => {
        if (e.data?.customMessageType === 'VistaLabelSaved') {
          const { side, designId } = e.data.message || {};
          if (!side || !designId) return;
          setLabelDesigns(prev => ({ ...prev, [side]: designId }));
        }
      };
      window.addEventListener('message', onMsg);
      return () => window.removeEventListener('message', onMsg);
    }, []);






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


    const onLabelStep =
      (selectedStep?.name || '').toLowerCase().includes('design') ||
      (selectedStep?.name || '').toLowerCase().includes('label');

    const frontVisible = !!labelAreas.front;
    const backVisible  = !!labelAreas.back;

    const handleLabelClick = (side: 'front' | 'back') => {
      const hasDesign = side === 'front' ? !!labelDesigns.front : !!labelDesigns.back;
      const type =
        side === 'front'
          ? (hasDesign ? 'EditFrontLabel' : 'DesignFrontLabel')
          : (hasDesign ? 'EditBackLabel'  : 'DesignBackLabel');

      window.parent.postMessage({
        customMessageType: type,
        message: {
          side,
          designId: side === 'front' ? labelDesigns.front : labelDesigns.back,
          productSku: product?.sku ?? null,
        }
      }, '*');
    };

    // useEffect(() => {
    //   const handleMessage = async (event: MessageEvent) => {
    //     if (event.data.customMessageType === "ConfirmOrder") {
    //       const order = event.data.message.order;
    //       console.log("Received order", order);

    //       const frontMeshId = getMeshIDbyName(`${order.product.bottle.toLowerCase()}_label_front`);
    //       const backMeshId = getMeshIDbyName(`${order.product.bottle.toLowerCase()}_label_back`);

    //       console.log(`${order.product.bottle.toLowerCase()}_label_front`);
    //       console.log("frontMeshId", frontMeshId);
    //       console.log("backMeshId", backMeshId);
          
          
    //       let retries = 100;
    //       while (items.length < 2 && retries > 0) {
    //       if (frontMeshId) setMeshDesignVisibility(frontMeshId, true);
    //       if (backMeshId) setMeshDesignVisibility(backMeshId, true);

    //       if (frontMeshId) restoreMeshVisibility(frontMeshId);
    //       if (backMeshId) restoreMeshVisibility(backMeshId);

    //       console.log("frontMeshId", frontMeshId);
    //       console.log("backMeshId", backMeshId);
    //         console.log("Waiting for items...");
    //         console.log("items", items);
    //         console.log("templates", templates);
    //         await new Promise((r) => setTimeout(r, 300));
    //         retries--;
    //       }

    //       if (items.length === 0) {
    //         console.error("❌ No items available for customization.");
    //         return;
    //       }

    //       const frontAreaId = items[0]?.areaId;
    //       const backAreaId = items[1]?.areaId;

    //       console.log("frontAreaId", frontAreaId);
    //       console.log("backAreaId", backAreaId);

    //       try {
    //         // const frontImage = await createImageFromUrl(order.front.previews[0].url);
    //         // const backImage = await createImageFromUrl(order.back.previews[0].url);
    //         const frontImage = await createImageFromUrl("https://barrel-n-bond.s3.eu-west-2.amazonaws.com/public/Front+Label+for+the+Polo+Bottle+inc+Bleed.jpg");
    //         const backImage = await createImageFromUrl("https://barrel-n-bond.s3.eu-west-2.amazonaws.com/public/Back+Label+for+the+Polo+Bottle+inc+Bleed.jpg");
    //         console.log("Uploaded images:", frontImage, backImage);

    //         if (frontImage?.imageID && frontAreaId) {
    //           await addItemImage(frontImage.imageID, frontAreaId);
    //         }
    //         if (backImage?.imageID && backAreaId) {
    //           await addItemImage(backImage.imageID, backAreaId);
    //         }
    //         console.log("✅ Label images applied.");
    //       } catch (err) {
    //         console.error("❌ Failed to apply label images:", err);
    //       }
    //     }
    //   };

    //   window.addEventListener("message", handleMessage);
    //   return () => window.removeEventListener("message", handleMessage);

    // }, [items, createImageFromUrl, addItemImage, getMeshIDbyName, setMeshDesignVisibility]);


    

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

    const showAddToCartButton = productObject.valid;

    return (
      <>
        <RotateNotice>Please rotate your device to landscape for the best experience.</RotateNotice>
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
                    if (currentIndex < selectedGroup.steps.length - 1) selectStep(selectedGroup.steps[currentIndex + 1].id);
                  }}
                  disabled={selectedGroup.steps.findIndex(s => s.id === selectedStep.id) === selectedGroup.steps.length - 1}
                  title="Next"
                >
                  →
                </NavButton>
              </div>
            )}

            {/* Options */}
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

            {onLabelStep && (frontVisible || backVisible) && (
              <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr', marginTop: 16 }}>
                {frontVisible && (
                  <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
                    <h4 style={{ marginTop: 0 }}>Front Label</h4>
                    <button onClick={() => handleLabelClick('front')}>
                      {labelDesigns.front ? 'Edit Front Label' : 'Design Front Label'}
                    </button>
                  </div>
                )}
                {backVisible && (
                  <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
                    <h4 style={{ marginTop: 0 }}>Back Label</h4>
                    <button onClick={() => handleLabelClick('back')}>
                      {labelDesigns.back ? 'Edit Back Label' : 'Design Back Label'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {selectedStep?.name && selectedAttribute && selectedAttribute.options.find(opt => opt.selected && opt.name !== "No Selection") && (
              <div style={{ marginTop: '24px', padding: '16px', background: '#f9f9f9', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <strong>Notes</strong>
                <p style={{ margin: '8px 0 0', color: '#555' }}>
                  {(() => {
                    const selectedOption = selectedAttribute.options.find(opt => opt.selected);
                    if (!selectedOption) return 'Select an option to see notes.';

                    const stepName = selectedStep.name.toLowerCase();
                    const category =
                      stepName.includes('bottle') ? 'bottles' :
                        stepName.includes('gin') || stepName.includes('liquid') ? 'liquids' :
                          stepName.includes('closure') ? 'closures' :
                            null;

                    if (!category || !optionNotes[category]) return null;

                    return optionNotes[category][selectedOption.name] || '';
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
                  : <span>Save and Create Label</span>}
              </CartButton>
            )}
          </div>
        </div>
        </LayoutWrapper>
      </>
    );
};

export default Selector;




















// import React, { FunctionComponent, useEffect, useMemo, useState } from 'react';
// import styled from 'styled-components';
// import { useZakeke } from 'zakeke-configurator-react';
// import { LayoutWrapper, ContentWrapper, Container,  StepTitle, OptionListItem, RotateNotice, NavButton, PriceWrapper, CartButton, LoadingSpinner } from './list';
// // import { List, StepListItem, , ListItemImage } from './list';
// import { optionNotes } from '../data/option-notes';
// import { TailSpin } from 'react-loader-spinner';

// const Selector: FunctionComponent<{}> = () => {
//     const {
//         isSceneLoading,
//         isAddToCartLoading,
//         price,
//         groups,
//         selectOption,
//         addToCart,
//         templates,
//         setTemplate,
//         setCamera,
//         product,
//         createImageFromUrl, 
//         addItemImage,
//         items,
//         getMeshIDbyName,
//         setMeshDesignVisibility,
//         restoreMeshVisibility
//     } = useZakeke();

    
//     console.log("groups", groups)
//     console.log("product", product)
//     console.log("items", items)
    
//     const group = groups.find(group => group.name === "Build Your Bottle")

//     const groupSteps = group ? group.steps : null

//     const bottleStepOptions = groupSteps ? groupSteps[0]?.attributes[0]?.options : null
//     // console.log("bottleStepOptions", bottleStepOptions)

//     const bottleSelectionIndex = bottleStepOptions
//     ? bottleStepOptions.findIndex(option => option.selected)
//     : -1;
//     const bottleSelection = bottleStepOptions ? bottleStepOptions.find(option => option.selected) : null
//     console.log("bottleSelection", bottleSelection)
    
//     const liquidStepOptions = groupSteps ? groupSteps[1]?.attributes[bottleSelectionIndex]?.options : null
//     const closureStepOptions = groupSteps ? groupSteps[2]?.attributes[bottleSelectionIndex]?.options : null
//     const labelStepOptions = groupSteps ? groupSteps[3]?.attributes[bottleSelectionIndex]?.options : null
    
//     const liquidSelection = liquidStepOptions ? liquidStepOptions.find(option => option.selected) : null
//     const closureSelection = closureStepOptions ? closureStepOptions.find(option => option.selected) : null
//     const labelSelection = labelStepOptions ? labelStepOptions.find(option => option.selected) : null
//     console.log("liquidSelection", liquidSelection)
//     console.log("closureSelection", closureSelection)
//     console.log("labelSelection", labelSelection)

//     const bottle = bottleSelection ? {
//         "id": bottleSelection.id,
//         "guid": bottleSelection.guid,
//         "name": bottleSelection.name,
//         "selected": bottleSelection.selected
//     } : null

//     const liquid = liquidSelection ? {
//         "id": liquidSelection.id,
//         "guid": liquidSelection.guid,
//         "name": liquidSelection.name,
//         "selected": liquidSelection.selected
//     } : null

//     const closure = closureSelection ? {
//         "id": closureSelection.id,
//         "guid": closureSelection.guid,
//         "name": closureSelection.name,
//         "selected": closureSelection.selected
//     } : null

//     const [selectedGroupId, selectGroup] = useState<number | null>(null);
//     const [selectedStepId, selectStep] = useState<number | null>(null);
//     const [selectedAttributeId, selectAttribute] = useState<number | null>(null);

//     const selectedGroup = groups.find(group => group.id === selectedGroupId);
//     const selectedStep = selectedGroup?.steps.find(step => step.id === selectedStepId) ?? null;

//     const attributes = useMemo(() => (selectedStep || selectedGroup)?.attributes ?? [], [selectedGroup, selectedStep]);
//     const selectedAttribute = attributes.find(attribute => attribute.id === selectedAttributeId);


//     useEffect(() => {
//       const bottleName = bottleSelection ? bottleSelection.name.toLowerCase() : '';
      
//       const frontMeshId = getMeshIDbyName(`${bottleName}_label_front`);
//       const backMeshId = getMeshIDbyName(`${bottleName}_label_back`);

//       console.log("frontMeshId", frontMeshId);
//       console.log("backMeshId", backMeshId);
        
//     }, [bottleSelection, getMeshIDbyName]);









//     useEffect(() => {
//         if (!selectedAttribute && attributes.length > 0) {
//             const firstEnabledAttribute = attributes.find(attr => attr.enabled);
//             if (firstEnabledAttribute) {
//                 selectAttribute(firstEnabledAttribute.id);
//             }
//         }
//     }, [selectedAttribute, attributes]);

//     useEffect(() => {
//         if (selectedGroup) {
//             const camera = selectedGroup.cameraLocationId;
//             if (camera) setCamera(camera);
//         }
//     }, [selectedGroupId, selectedGroup, setCamera]);

    

//     // useEffect(() => {
//     //   const handleMessage = async (event: MessageEvent) => {
//     //     if (event.data.customMessageType === "ConfirmOrder") {
//     //       const order = event.data.message.order;
//     //       console.log("Received order", order);

//     //       const frontMeshId = getMeshIDbyName(`${order.product.bottle.toLowerCase()}_label_front`);
//     //       const backMeshId = getMeshIDbyName(`${order.product.bottle.toLowerCase()}_label_back`);

//     //       console.log(`${order.product.bottle.toLowerCase()}_label_front`);
//     //       console.log("frontMeshId", frontMeshId);
//     //       console.log("backMeshId", backMeshId);
          
          
//     //       let retries = 100;
//     //       while (items.length < 2 && retries > 0) {
//     //       if (frontMeshId) setMeshDesignVisibility(frontMeshId, true);
//     //       if (backMeshId) setMeshDesignVisibility(backMeshId, true);

//     //       if (frontMeshId) restoreMeshVisibility(frontMeshId);
//     //       if (backMeshId) restoreMeshVisibility(backMeshId);

//     //       console.log("frontMeshId", frontMeshId);
//     //       console.log("backMeshId", backMeshId);
//     //         console.log("Waiting for items...");
//     //         console.log("items", items);
//     //         console.log("templates", templates);
//     //         await new Promise((r) => setTimeout(r, 300));
//     //         retries--;
//     //       }

//     //       if (items.length === 0) {
//     //         console.error("❌ No items available for customization.");
//     //         return;
//     //       }

//     //       const frontAreaId = items[0]?.areaId;
//     //       const backAreaId = items[1]?.areaId;

//     //       console.log("frontAreaId", frontAreaId);
//     //       console.log("backAreaId", backAreaId);

//     //       try {
//     //         // const frontImage = await createImageFromUrl(order.front.previews[0].url);
//     //         // const backImage = await createImageFromUrl(order.back.previews[0].url);
//     //         const frontImage = await createImageFromUrl("https://barrel-n-bond.s3.eu-west-2.amazonaws.com/public/Front+Label+for+the+Polo+Bottle+inc+Bleed.jpg");
//     //         const backImage = await createImageFromUrl("https://barrel-n-bond.s3.eu-west-2.amazonaws.com/public/Back+Label+for+the+Polo+Bottle+inc+Bleed.jpg");
//     //         console.log("Uploaded images:", frontImage, backImage);

//     //         if (frontImage?.imageID && frontAreaId) {
//     //           await addItemImage(frontImage.imageID, frontAreaId);
//     //         }
//     //         if (backImage?.imageID && backAreaId) {
//     //           await addItemImage(backImage.imageID, backAreaId);
//     //         }
//     //         console.log("✅ Label images applied.");
//     //       } catch (err) {
//     //         console.error("❌ Failed to apply label images:", err);
//     //       }
//     //     }
//     //   };

//     //   window.addEventListener("message", handleMessage);
//     //   return () => window.removeEventListener("message", handleMessage);

//     // }, [items, createImageFromUrl, addItemImage, getMeshIDbyName, setMeshDesignVisibility]);


    

//     if (isSceneLoading || !groups || groups.length === 0)
//         return <LoadingSpinner />;
    
//     const handleAddToCart = async () => {
//     try {
//         await addToCart(
//             {},
//             async (data) => {
//                 console.log("data", data);

//                 console.log("postMessage Content:", {
//                     customMessageType: "AddToCart",
//                     message: {
//                         preview: data.preview,
//                         quantity: data.quantity,
//                         compositionId: data.composition,
//                         zakekeAttributes: data.attributes,
//                         product_id: product?.sku || null,
//                         bottle: bottle ? bottle : null,
//                         liquid: liquid ? liquid : null,
//                         closure: closure ? closure : null,
//                     }
//                 }
//                 )

//                 window.parent.postMessage({
//                     customMessageType: "AddToCart",
//                     message: {
//                         preview: data.preview,
//                         quantity: data.quantity,
//                         compositionId: data.composition,
//                         zakekeAttributes: data.attributes,
//                         product_id: product?.sku || null,
//                         bottle: bottle ? bottle : null,
//                         liquid: liquid ? liquid : null,
//                         closure: closure ? closure : null,
//                     }
//                 }, "*");

//                 return data;
//             },
//             false 
//         );
//     } catch (error) {
//         console.error('Error during addToCart:', error);
//     }
// };

//     const showAddToCartButton =
//         bottleSelection &&
//         liquidSelection &&
//         closureSelection &&
//         liquidSelection.name !== "No Selection" &&
//         closureSelection.name !== "No Selection";

//     return (
//       <>
//         <RotateNotice>Please rotate your device to landscape for the best experience.</RotateNotice>
//         <LayoutWrapper>
//         <ContentWrapper>
//           <Container>
//             {/* Step Navigation */}
//             {selectedGroup && selectedGroup.steps.length > 0 && selectedStep && (
//               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '16px 0' }}>
//                 <NavButton
//                   onClick={() => {
//                     const currentIndex = selectedGroup.steps.findIndex(s => s.id === selectedStep.id);
//                     if (currentIndex > 0) selectStep(selectedGroup.steps[currentIndex - 1].id);
//                   }}
//                   disabled={selectedGroup.steps.findIndex(s => s.id === selectedStep.id) === 0}
//                   title="Back"
//                 >
//                   ←
//                 </NavButton>

//                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
//                   <StepTitle>{selectedStep.name}</StepTitle>
//                   <span style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
//                     Step {selectedGroup.steps.findIndex(s => s.id === selectedStep.id) + 1} of {selectedGroup.steps.length}
//                   </span>
//                 </div>

//                 <NavButton
//                   onClick={() => {
//                     const currentIndex = selectedGroup.steps.findIndex(s => s.id === selectedStep.id);
//                     if (currentIndex < selectedGroup.steps.length - 1) selectStep(selectedGroup.steps[currentIndex + 1].id);
//                   }}
//                   disabled={selectedGroup.steps.findIndex(s => s.id === selectedStep.id) === selectedGroup.steps.length - 1}
//                   title="Next"
//                 >
//                   →
//                 </NavButton>
//               </div>
//             )}

//             {/* Options */}
//             <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
//               {selectedAttribute?.options
//                 .filter(() => true)
//                 .map(option => (
//                   option.name !== "No Selection" && (
//                     <OptionListItem
//                       key={option.id}
//                       onClick={() => {
//                         console.log('User selected option:', {
//                           name: option.name,
//                           attribute: selectedAttribute.name,
//                           enabled: option.enabled,
//                           selected: option.selected
//                         });
//                         selectOption(option.id);
//                       }}
//                       selected={option.selected}
//                       style={{
//                         width: '200px',
//                         cursor: 'pointer',
//                         transition: 'all 0.2s ease-in-out',
//                         boxShadow: option.selected ? '0 0 0 2px black' : 'none',
//                         border: option.selected ? '2px solid #222' : '1px solid #ddd',
//                         borderRadius: '8px',
//                         background: option.selected ? '#f3f3fa' : '#fff',
//                         outline: 'none'
//                       }}
//                       tabIndex={0}
//                       onMouseOver={e => {
//                         (e.currentTarget as HTMLElement).style.boxShadow = option.selected
//                           ? '0 0 0 2.5px #333'
//                           : '0 2px 8px rgba(0,0,0,0.07)';
//                       }}
//                       onMouseOut={e => {
//                         (e.currentTarget as HTMLElement).style.boxShadow = option.selected
//                           ? '0 0 0 2px black'
//                           : 'none';
//                       }}
//                       onFocus={e => {
//                         (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 2.5px #0074d9';
//                       }}
//                       onBlur={e => {
//                         (e.currentTarget as HTMLElement).style.boxShadow = option.selected
//                           ? '0 0 0 2px black'
//                           : 'none';
//                       }}
//                     >
//                       <div style={{ display: 'flex', flexDirection: 'column' }}>
//                         <span style={{ fontWeight: 600, color: option.selected ? '#000' : undefined }}>{option.name}</span>
//                         {selectedStep?.name === "Select your Gin" && option.description && (
//                           <span style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
//                             {option.description}
//                           </span>
//                         )}
//                       </div>
//                     </OptionListItem>
//                   )
//                 ))}
//             </div>

//             {selectedStep?.name && selectedAttribute && selectedAttribute.options.find(opt => opt.selected && opt.name !== "No Selection") && (
//               <div style={{ marginTop: '24px', padding: '16px', background: '#f9f9f9', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
//                 <strong>Notes</strong>
//                 <p style={{ margin: '8px 0 0', color: '#555' }}>
//                   {(() => {
//                     const selectedOption = selectedAttribute.options.find(opt => opt.selected);
//                     if (!selectedOption) return 'Select an option to see notes.';

//                     const stepName = selectedStep.name.toLowerCase();
//                     const category =
//                       stepName.includes('bottle') ? 'bottles' :
//                         stepName.includes('gin') || stepName.includes('liquid') ? 'liquids' :
//                           stepName.includes('closure') ? 'closures' :
//                             null;

//                     if (!category || !optionNotes[category]) return null;

//                     return optionNotes[category][selectedOption.name] || '';
//                   })()}
//                 </p>
//               </div>
//             )}
//           </Container>
//         </ContentWrapper>
//         <div style={{ position: 'sticky', bottom: 0, background: '#fff', padding: '16px 16px 24px', borderTop: '1px solid #ccc', zIndex: 10 }}>
//           <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
//             <h3 style={{ margin: 0 }}>Price: {price}</h3>
//             {showAddToCartButton && (
//               <CartButton onClick={handleAddToCart}>
//                 {isAddToCartLoading
//                   ? <TailSpin color="#FFFFFF" height="25px" />
//                   : <span>Save and Create Label</span>}
//               </CartButton>
//             )}
//           </div>
//         </div>
//         </LayoutWrapper>
//       </>
//     );
// };

// export default Selector;