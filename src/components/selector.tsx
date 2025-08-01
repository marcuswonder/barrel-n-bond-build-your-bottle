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
        templates,
        setTemplate,
        setCamera,
        product,
        createImageFromUrl, 
        addItemImage,
        items,
        getMeshIDbyName,
        setMeshDesignVisibility,
        restoreMeshVisibility
    } = useZakeke();

    
    console.log("groups", groups)
    console.log("product", product)
    
    const group = groups.find(group => group.name === "Build Your Bottle")

    const groupSteps = group ? group.steps : null

    const bottleStepOptions = groupSteps ? groupSteps[0]?.attributes[0]?.options : null
    // console.log("bottleStepOptions", bottleStepOptions)

    const bottleSelectionIndex = bottleStepOptions
    ? bottleStepOptions.findIndex(option => option.selected)
    : -1;
    const bottleSelection = bottleStepOptions ? bottleStepOptions.find(option => option.selected) : null
    console.log("bottleSelection", bottleSelection)
    
    const liquidStepOptions = groupSteps ? groupSteps[1]?.attributes[bottleSelectionIndex]?.options : null
    const closureStepOptions = groupSteps ? groupSteps[2]?.attributes[bottleSelectionIndex]?.options : null
    // console.log("liquidStepOptions", liquidStepOptions)
    // console.log("closureStepOptions", closureStepOptions)
    
    const liquidSelection = liquidStepOptions ? liquidStepOptions.find(option => option.selected) : null
    const closureSelection = closureStepOptions ? closureStepOptions.find(option => option.selected) : null
    console.log("liquidSelection", liquidSelection)
    console.log("closureSelection", closureSelection)

    const bottle = bottleSelection ? {
        "id": bottleSelection.id,
        "guid": bottleSelection.guid,
        "name": bottleSelection.name,
        "selected": bottleSelection.selected
    } : null

    const liquid = liquidSelection ? {
        "id": liquidSelection.id,
        "guid": liquidSelection.guid,
        "name": liquidSelection.name,
        "selected": liquidSelection.selected
    } : null

    const closure = closureSelection ? {
        "id": closureSelection.id,
        "guid": closureSelection.guid,
        "name": closureSelection.name,
        "selected": closureSelection.selected
    } : null

    const [selectedGroupId, selectGroup] = useState<number | null>(null);
    const [selectedStepId, selectStep] = useState<number | null>(null);
    const [selectedAttributeId, selectAttribute] = useState<number | null>(null);

    const selectedGroup = groups.find(group => group.id === selectedGroupId);
    const selectedStep = selectedGroup?.steps.find(step => step.id === selectedStepId) ?? null;

    const attributes = useMemo(() => (selectedStep || selectedGroup)?.attributes ?? [], [selectedGroup, selectedStep]);
    const selectedAttribute = attributes.find(attribute => attribute.id === selectedAttributeId);

    useEffect(() => {
        if (!selectedGroup && groups.length > 0) {
            const bottleGroup = groups.find(g => g.name === 'Build Your Bottle') || groups[0];
            selectGroup(bottleGroup.id);

            if (bottleGroup.steps.length > 0)
                selectStep(bottleGroup.steps[0].id);

            if (templates.length > 0)
                setTemplate(templates[0].id);

            setTemplate(1111111);
        }
    }, [selectedGroup, groups, templates, setTemplate]);

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
    //   console.log("Current Zakeke templates:", templates);
    //   console.log("Current Zakeke items:", items);
    //   setMeshDesignVisibility("origin_label_front", true);
    // }, [templates, items, setMeshDesignVisibility]);
    
    // useEffect(() => {
    //   console.log("Current Zakeke templates:", items);

    //   const poloLabelFrontMeshId = getMeshIDbyName("polo_label_front");
    //   const poloLabelBackMeshId = getMeshIDbyName("polo_label_back");
      
    //   console.log("poloLabelFrontMeshId", poloLabelFrontMeshId);
    //   console.log("poloLabelBackMeshId", poloLabelBackMeshId);
    //   if (poloLabelFrontMeshId) setMeshDesignVisibility(poloLabelFrontMeshId, true);
    //   if (poloLabelBackMeshId) setMeshDesignVisibility(poloLabelBackMeshId, true);
    // }, [items, getMeshIDbyName, setMeshDesignVisibility]);


    // useEffect(() => {
    //   window.addEventListener("message", async (event) => {
    //     if (event.data.customMessageType === "VistaLabelSaved") {
    //       const imageUrl = event.data.message.previewUrl;
    //       console.log("imageUrl", imageUrl);
          
    //       try {
    //         const uploadedImage = await createImageFromUrl(imageUrl);
    //         console.log("uploadedImage", uploadedImage);
    //         console.log("Current Zakeke items:", items);
    //         console.log("Current Zakeke templates:", templates);

    //         const poloLabelFrontMeshId = getMeshIDbyName("polo_label_front");
    //         const poloLabelBackMeshId = getMeshIDbyName("polo_label_back");
    //         console.log("poloLabelFrontMeshId", poloLabelFrontMeshId);
    //         console.log("poloLabelBackMeshId", poloLabelBackMeshId);  

    //         const poloLabelFrontAreaId = items[0]?.areaId

    //         await addItemImage(uploadedImage.imageID, poloLabelFrontAreaId);
    //         // console.log("Design image applied to 3D product.");
    //       } catch (e) {
    //         console.error("Error uploading image to Zakeke:", e);
    //       }
    //     }
    //   });
    // }, [createImageFromUrl, addItemImage, getMeshIDbyName, setMeshDesignVisibility, items, templates]);

    useEffect(() => {
      const handleMessage = async (event: MessageEvent) => {
        if (event.data.customMessageType === "ConfirmOrder") {
          const order = event.data.message.order;
          console.log("Received order", order);

          const frontMeshId = getMeshIDbyName(`${order.product.bottle.toLowerCase()}_label_front`);
          const backMeshId = getMeshIDbyName(`${order.product.bottle.toLowerCase()}_label_back`);

          console.log(`${order.product.bottle.toLowerCase()}_label_front`);
          console.log("frontMeshId", frontMeshId);
          console.log("backMeshId", backMeshId);
          
          
          let retries = 100;
          while (items.length < 2 && retries > 0) {
          if (frontMeshId) setMeshDesignVisibility(frontMeshId, true);
          if (backMeshId) setMeshDesignVisibility(backMeshId, true);

          if (frontMeshId) restoreMeshVisibility(frontMeshId);
          if (backMeshId) restoreMeshVisibility(backMeshId);

          console.log("frontMeshId", frontMeshId);
          console.log("backMeshId", backMeshId);
            console.log("Waiting for items...");
            console.log("items", items);
            console.log("templates", templates);
            await new Promise((r) => setTimeout(r, 300));
            retries--;
          }

          if (items.length === 0) {
            console.error("❌ No items available for customization.");
            return;
          }

          const frontAreaId = items[0]?.areaId;
          const backAreaId = items[1]?.areaId;

          console.log("frontAreaId", frontAreaId);
          console.log("backAreaId", backAreaId);

          try {
            // const frontImage = await createImageFromUrl(order.front.previews[0].url);
            // const backImage = await createImageFromUrl(order.back.previews[0].url);
            const frontImage = await createImageFromUrl("https://barrel-n-bond.s3.eu-west-2.amazonaws.com/public/Front+Label+for+the+Polo+Bottle+inc+Bleed.jpg");
            const backImage = await createImageFromUrl("https://barrel-n-bond.s3.eu-west-2.amazonaws.com/public/Back+Label+for+the+Polo+Bottle+inc+Bleed.jpg");
            console.log("Uploaded images:", frontImage, backImage);

            if (frontImage?.imageID && frontAreaId) {
              await addItemImage(frontImage.imageID, frontAreaId);
            }
            if (backImage?.imageID && backAreaId) {
              await addItemImage(backImage.imageID, backAreaId);
            }
            console.log("✅ Label images applied.");
          } catch (err) {
            console.error("❌ Failed to apply label images:", err);
          }
        }
      };

      window.addEventListener("message", handleMessage);
      return () => window.removeEventListener("message", handleMessage);

    }, [items, createImageFromUrl, addItemImage, getMeshIDbyName, setMeshDesignVisibility]);


    // useEffect(() => {
    //   window.addEventListener("message", async (event) => {
    //     if (event.data.customMessageType === "ConfirmOrder") {
    //       const order = event.data.message.order;
    //       console.log("order", order);

    //       const frontMeshId = getMeshIDbyName(`${order.product.bottle.toLowerCase()}_label_front`);
    //       const backMeshId = getMeshIDbyName(`${order.product.bottle.toLowerCase()}_label_back`);
    //       console.log("frontMeshId", frontMeshId);
    //       console.log("backMeshId", backMeshId);

    //       if (frontMeshId) setMeshDesignVisibility(frontMeshId, true);
    //       if (backMeshId) setMeshDesignVisibility(backMeshId, true);

    //       console.log("items", items);
    //       console.log("templates", templates);

    //       const frontAreaId = items[0]?.areaId 
    //       const backAreaId = items[1]?.areaId 

    //       console.log("frontAreaId", frontAreaId);
    //       console.log("backAreaId", backAreaId);
          
    //       // try {
    //       //   const frontLabelDesign = await createImageFromUrl(order.front.previews[0].url);
    //       //   const backLabelDesign = await createImageFromUrl(order.back.previews[0].url);
            
    //       //   console.log("frontLabelDesign", frontLabelDesign);
    //       //   console.log("backLabelDesign", backLabelDesign);

    //       //   // await addItemImage(uploadedImage.imageID, poloLabelFrontAreaId);
    //       //   // // console.log("Design image applied to 3D product.");
    //       // } catch (e) {
    //       //   console.error("Error uploading image to Zakeke:", e);
    //       // }
    //     }
    //   });
    // }, [createImageFromUrl, addItemImage, getMeshIDbyName, setMeshDesignVisibility, items, templates]);

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
                        bottle: bottle ? bottle : null,
                        liquid: liquid ? liquid : null,
                        closure: closure ? closure : null,
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
                        bottle: bottle ? bottle : null,
                        liquid: liquid ? liquid : null,
                        closure: closure ? closure : null,
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

    const showAddToCartButton =
        bottleSelection &&
        liquidSelection &&
        closureSelection &&
        liquidSelection.name !== "No Selection" &&
        closureSelection.name !== "No Selection";

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
// import { List, ListItem, ListItemImage } from './list';

// const Container = styled.div`
//     height: 100%;
//     overflow: auto;
// `;

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
//     } = useZakeke();

//     // Keep saved the ID and not the refereces, they will change on each update
//     const [selectedGroupId, selectGroup] = useState<number | null>(null);
//     const [selectedStepId, selectStep] = useState<number | null>(null);
//     const [selectedAttributeId, selectAttribute] = useState<number | null>(null);

//     const selectedGroup = groups.find(group => group.id === selectedGroupId);
//     const selectedStep = selectedGroup ? selectedGroup.steps.find(step => step.id === selectedStepId) : null;

//     // Attributes can be in both groups and steps, so show the attributes of step or in a group based on selection
//     const attributes = useMemo(() => (selectedStep || selectedGroup)?.attributes ?? [], [selectedGroup, selectedStep]);
//     const selectedAttribute = attributes.find(attribute => attribute.id === selectedAttributeId);

//     // Open the first group and the first step when loaded
//     useEffect(() => {
//         if (!selectedGroup && groups.length > 0) {
//             selectGroup(groups[0].id);

//             if (groups[0].steps.length > 0)
//                 selectStep(groups[0].steps[0].id);

//             if (templates.length > 0)
//                 setTemplate(templates[0].id)
//         }

//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [selectedGroup, groups]);

//     // Select attribute first time
//     useEffect(() => {
//         if (!selectedAttribute && attributes.length > 0)
//             selectAttribute(attributes[0].id);

//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [selectedAttribute, attributes])

//     useEffect(() => {
//         if (selectedGroup) {
//             const camera = selectedGroup.cameraLocationId;
//             if (camera)
//                 setCamera(camera);
//         }

//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [selectedGroupId]);

//     if (isSceneLoading || !groups || groups.length === 0)
//         return <span>Loading scene...</span>;

//     // groups
//     // -- attributes
//     // -- -- options
//     // -- steps
//     // -- -- attributes
//     // -- -- -- options

//     return <Container>
//         <List>
//             {groups.map(group => {
//                 return <ListItem key={group.id} onClick={() => {
//                     selectGroup(group.id)
//                 }} selected={selectedGroup === group}>Group: {group.id === -1 ? 'Other' : group.name}</ListItem>;
//             })}
//         </List>

//         {selectedGroup && selectedGroup.steps.length > 0 && <List>
//             {selectedGroup.steps.map(step => {
//                 return <ListItem key={step.id} onClick={() => selectStep(step.id)} selected={selectedStep === step}>Step: {step.name}</ListItem>;
//             })}
//         </List>}

//         <List>
//             {attributes && attributes.map(attribute => {
//                 return <ListItem key={attribute.id} onClick={() => selectAttribute(attribute.id)} selected={selectedAttribute === attribute}>Attribute: {attribute.name}</ListItem>;
//             })}
//         </List>

//         <List>
//             {selectedAttribute && selectedAttribute.options.map(option => {
//                 return <ListItem key={option.id} onClick={() => selectOption(option.id)} selected={option.selected}>
//                     {option.imageUrl && <ListItemImage src={option.imageUrl} />}
//                     Option: {option.name}
//                 </ListItem>;
//             })}
//         </List>

//         <h3>Price: {price}</h3>
//         {isAddToCartLoading ? 'Adding to cart...' : <button onClick={addToCart}>Add to cart</button>}

//     </Container>
// }

// export default Selector;