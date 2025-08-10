import React, { FunctionComponent, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useZakeke } from 'zakeke-configurator-react';
import { LayoutWrapper, ContentWrapper, Container,  StepTitle, OptionListItem, RotateNotice, NavButton, PriceWrapper, CartButton, LoadingSpinner } from './list';
// import { List, StepListItem, , ListItemImage } from './list';
import { optionNotes } from '../data/option-notes';
import { TailSpin } from 'react-loader-spinner';
import { useOrderStore } from '../state/orderStore';

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
        previewOnly__setItemImageFromBase64,
        setCameraByName,
        removeItem
        // templates,
        // setTemplate,
        // setMeshDesignVisibility,
        // restoreMeshVisibility,
    } = useZakeke();

    
    console.log("groups", groups)
    console.log("product", product)
    console.log("items", items)
    
    
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

    const pick = (stepIdx: number) => (
      bottleIdx >= 0
        ? steps[stepIdx]?.attributes?.[bottleIdx]?.options?.find(o => o.selected) ?? null
        : null
    );

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

    const selections = {
      bottleSel,
      liquidSel,
      closureSel,
      labelSel,
      bottle: miniBottle,
      liquid: miniLiquid,
      closure: miniClosure,
      label: miniLabel,
    } as const;

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

    const { setFromSelections } = useOrderStore();

    useEffect(() => {
      setFromSelections({
        selections,
        sku: product?.sku ?? null,
        price,
      });
    }, [orderKey]);

    const [labelDesigns, setLabelDesigns] = useState<{ front: string | null; back: string | null }>({
      front: null,
      back: null,
    });

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
          frontDesignId: labelDesigns.front,
          backDesignId: labelDesigns.back,
        },
        mesh: { frontMeshId, backMeshId },
        valid,
      } as const;
    }, [price, product?.sku, selections, getMeshIDbyName, labelDesigns.front, labelDesigns.back, miniBottle, miniClosure, miniLiquid]);

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
      const onMsg = async (e: MessageEvent) => {
        if (e.data?.customMessageType === 'uploadDesign') {
          console.log("Received uploadDesign message:", e.data.message);

          const { designSide, order } = e.data.message || {};
          console.log("designSide", designSide)
          console.log("order", order)

          // items.forEach(item => {
          //   const itemGuid = item.guid;
          //   removeItem(itemGuid)
          // })

          if (!designSide || !order) return;

          // const dataUrl = order?.[designSide]?.base64Preview?.dataUrl || null;
          // console.log('base64Preview dataUrl', dataUrl);

          // const bottleName = selections.bottle?.name ? selections.bottle.name.toLowerCase() : '';
          // const areaName = bottleName ? `${bottleName}_label_${designSide}` : '';
          // const areaId = product?.areas?.find(a => a.name === areaName)?.id || null;
          
          // const guid = items.find(i => i.areaId === areaId)?.guid || null;
          // // const guid = items[0]?.guid || null;
          
          // console.log(`guid for ${areaName}`, guid)

          // if (dataUrl && guid) {
          //   console.log("Uploading preview to: ", areaName);
          //   console.log("Preview Upload Details", {
          //     guid,
          //     hasData: !!dataUrl,
          //     base64Length: dataUrl?.length
          //   });
          //   const rawBase64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
          //   // const rawBase64 = "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8BP+ia+Gf/BNZf8Axqv0E/js9Q/tTTP+fuH/AL+L/jR/ammf8/cP/fxf8a8v/wCGffgJ/wBE18M/+Cay/wDjVH/DPvwE/wCia+Gf/BNZf/GqAP/T/fyiiigAr4t/bL/5A3hj/r4uf/QEr7Sr4t/bL/5A3hj/AK+Ln/0BK83N/wDdp/11Pt/Dj/kdYf1f/pLPgWiiivgT+uQooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAr6q/ZA/5KZqH/AGCZv/R8FfKtfVX7IH/JTNQ/7BM3/o+Cu/K/94h6nyfHf/IoxP8AhP0iooor9BP47CiiigD/1P38ooooAK+Lf2y/+QN4Y/6+Ln/0BK+0q+Lf2y/+QN4Y/wCvi5/9ASvNzf8A3af9dT7fw4/5HWH9X/6Sz4Fooor4E/rkKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAK+qv2QP+Smah/wBgmb/0fBXyrX1V+yB/yUzUP+wTN/6Pgrvyv/eIep8nx3/yKMT/AIT9IqKKK/QT+OwooooA/9X9/KKKKACvi39sv/kDeGP+vi5/9ASvtKvi39sv/kDeGP8Ar4uf/QErzc3/AN2n/XU+38OP+R1h/V/+ks+BaKKK+BP65CiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACvqr9kD/kpmof8AYJm/9HwV8q19Vfsgf8lM1D/sEzf+j4K78r/3iHqfJ8d/8ijE/wCE/SKiiiv0E/jsKKKKAP/W/fyiiigAr4t/bL/5A3hj/r4uf/QEr7Sr4t/bL/5A3hj/AK+Ln/0BK83N/wDdp/11Pt/Dj/kdYf1f/pLPgWiiivgT+uQooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAr6q/ZA/5KZqH/AGCZv/R8FfKtfVX7IH/JTNQ/7BM3/o+Cu/K/94h6nyfHf/IoxP8AhP0iooor9BP47CiiigD/1/38ooooAK+Lf2y/+QN4Y/6+Ln/0BK+0q+Lf2y/+QN4Y/wCvi5/9ASvNzf8A3af9dT7fw4/5HWH9X/6Sz4Fooor4E/rkKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAK+qv2QP+Smah/wBgmb/0fBXyrX1V+yB/yUzUP+wTN/6Pgrvyv/eIep8nx3/yKMT/AIT9IqKKK/QT+OwooooA/9D9/KKKKACvi39sv/kDeGP+vi5/9ASvtKvi39sv/kDeGP8Ar4uf/QErzc3/AN2n/XU+38OP+R1h/V/+ks+BaKKK+BP65CiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACvqr9kD/kpmof8AYJm/9HwV8q19Vfsgf8lM1D/sEzf+j4K78r/3iHqfJ8d/8ijE/wCE/SKiiiv0E/jsKKKKAP/R/fyiiigAr4t/bL/5A3hj/r4uf/QEr7Sr4t/bL/5A3hj/AK+Ln/0BK83N/wDdp/11Pt/Dj/kdYf1f/pLPgWiiivgT+uQooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAr6q/ZA/5KZqH/AGCZv/R8FfKtfVX7IH/JTNQ/7BM3/o+Cu/K/94h6nyfHf/IoxP8AhP0iooor9BP47CiiigD/0v38ooooAK+Lf2y/+QN4Y/6+Ln/0BK+0q+Lf2y/+QN4Y/wCvi5/9ASvNzf8A3af9dT7fw4/5HWH9X/6Sz4Fooor4E/rkKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAK+qv2QP+Smah/wBgmb/0fBXyrX1V+yB/yUzUP+wTN/6Pgrvyv/eIep8nx3/y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";
          //   console.log("rawBase64", rawBase64)
            
          //   const preview = previewOnly__setItemImageFromBase64(guid, rawBase64);
          //   console.log("preview", preview)

          //   console.log("Setting camera to :", areaName);
          //   setCameraByName(areaName, false, false)
          // }

          // pick the *current* target area from the active bottle
          const bottleName = selections.bottle?.name?.toLowerCase() ?? '';
          const areaName = `${bottleName}_label_${designSide}`;

          const area = product?.areas?.find(a => a.name === areaName);
          if (!area) {
            console.warn('No area found', { areaName });
            return;
          }
          const areaId = Number(area.id);

          // wait a tick to let items settle after template/attribute changes
          await new Promise(r => setTimeout(r, 0));

          // re-resolve the *latest* image item for that area
          const imageItem = [...(items ?? [])]
            .reverse()
            .find(i => Number(i.areaId) === areaId && i.type === 1);

          if (!imageItem?.guid) {
            console.warn('No image item for area', { areaName, areaId, items });
            return;
          }

          const dataUrl = order?.[designSide]?.base64Preview?.dataUrl ?? '';

          const normaliseB64 = (input: string): string => {
            let b64 = input.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
            b64 = b64.replace(/-/g, '+').replace(/_/g, '/'); // URL-safe → standard
            while (b64.length % 4) b64 += '=';
            return b64;
          };

          const b64Clean: string = normaliseB64(dataUrl);
          if (!b64Clean || b64Clean.length < 64) {
            console.warn('Base64 looks empty/too short');
            return;
          }

          console.log('fn typeof', typeof previewOnly__setItemImageFromBase64);
          console.log('fn source', previewOnly__setItemImageFromBase64?.toString?.().slice(0,120));
          console.log('fn window', window === window.top ? 'top' : 'iframe/child');

          // 2) Call the SDK with a *string*, not the function
          try {
            if (typeof previewOnly__setItemImageFromBase64 !== 'function') {
              console.error('previewOnly__setItemImageFromBase64 is not a function');
              return;
            }
            await Promise.resolve(
              previewOnly__setItemImageFromBase64(imageItem.guid as string, b64Clean)
            );
            console.log('preview applied to', imageItem.guid);
          } catch (e) {
            console.error('Failed to set preview image', e);
          }

          const item = items?.find(i => i.areaId === areaId);
          setTimeout(() => {
            const w = window as any; // bypass TS type check
            console.log(
              'Updated item in store:',
              w.__REDUX_DEVTOOLS_EXTENSION__?.()
                || (w.store?.getState
                    ? w.store.getState().items.find((i: any) => i.guid === item?.guid)
                    : '⚠️ Store object not found')
            );
          }, 200);

          // optional: focus camera
          setCameraByName(areaName, false, false);



          // if(designSide === "front") {
          //   const frontImage = await createImageFromUrl("https://barrel-n-bond.s3.eu-west-2.amazonaws.com/public/Front+Label+for+the+Polo+Bottle+inc+Bleed.jpg");
          //   const frontMeshId = getMeshIDbyName(`${order.product.bottle.toLowerCase()}_label_front`);
          //   console.log("frontMeshId", frontMeshId);

          //   const frontAreaId = product?.areas.find(a => a.name === order.product.bottle.toLowerCase() + '_label_front')?.id;
          //   console.log("frontAreaId", frontAreaId);
            
          //   if (frontImage?.imageID && frontAreaId) {
          //     await addItemImage(frontImage.imageID, frontAreaId);
          //   }
          
          // } else if( designSide === "back") {
          //   const backImage = await createImageFromUrl("https://barrel-n-bond.s3.eu-west-2.amazonaws.com/public/Back+Label+for+the+Polo+Bottle+inc+Bleed.jpg");
  
          //   const backMeshId = getMeshIDbyName(`${order.product.bottle.toLowerCase()}_label_back`);
          //   console.log("backMeshId", backMeshId);
  
          //   const backAreaId = product?.areas.find(a => a.name === order.product.bottle.toLowerCase() + '_label_back')?.id;
  
          //   console.log("backAreaId", backAreaId);
  
          //   if (backImage?.imageID && backAreaId) {
          //     await addItemImage(backImage.imageID, backAreaId);
          //   }
          // }





        }
      };
      window.addEventListener('message', onMsg);
      return () => window.removeEventListener('message', onMsg);
    }, [previewOnly__setItemImageFromBase64, items, product?.areas, selections.bottle?.name, setCameraByName]);


    



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

    const handleLabelClick = (side: 'front' | 'back') => {
      const hasDesign = side === 'front' ? !!labelDesigns.front : !!labelDesigns.back;
      const designType = hasDesign ? 'edit' : 'design';
      const designId = side === 'front' ? labelDesigns.front : labelDesigns.back;

      window.parent.postMessage({
        customMessageType: 'callDesigner',
        message: {
          'order': {
            'bottle': productObject.selections.bottle,
            'liquid': productObject.selections.liquid,
            'closure': productObject.selections.closure,
            'label': productObject.selections.label,
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

    // useEffect(() => {
    //   const handleMessage = async (event: MessageEvent) => {
    //     if (event.data.customMessageType === "uploadDesign") {
    //       const side = event.data.message.side;
    //       const order = event.data.message.order;
    //       console.log("Received order", order);

    //       if(side === "front") {
    //         const frontImage = await createImageFromUrl("https://barrel-n-bond.s3.eu-west-2.amazonaws.com/public/Front+Label+for+the+Polo+Bottle+inc+Bleed.jpg");
    //         const frontMeshId = getMeshIDbyName(`${order.product.bottle.toLowerCase()}_label_front`);
    //         console.log("frontMeshId", frontMeshId);

    //         const frontAreaId = product?.areas.find(a => a.name === order.product.bottle.toLowerCase() + '_label_front')?.id;
    //         console.log("frontAreaId", frontAreaId);
            
    //         if (frontImage?.imageID && frontAreaId) {
    //           await addItemImage(frontImage.imageID, frontAreaId);
    //         }
          
    //       } else if( side === "back") {
    //         const backImage = await createImageFromUrl("https://barrel-n-bond.s3.eu-west-2.amazonaws.com/public/Back+Label+for+the+Polo+Bottle+inc+Bleed.jpg");
  
    //         const backMeshId = getMeshIDbyName(`${order.product.bottle.toLowerCase()}_label_back`);
    //         console.log("backMeshId", backMeshId);
  
    //         const backAreaId = product?.areas.find(a => a.name === order.product.bottle.toLowerCase() + '_label_back')?.id;
  
    //         console.log("backAreaId", backAreaId);
  
    //         if (backImage?.imageID && backAreaId) {
    //           await addItemImage(backImage.imageID, backAreaId);
    //         }
    //       }
    //     }
    //   };

    //   window.addEventListener("message", handleMessage);
    //   return () => window.removeEventListener("message", handleMessage);
    // }, [items, createImageFromUrl, addItemImage, getMeshIDbyName, product?.areas]);


    

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
            {/* Options (hidden on label step) */}
            {!onLabelStep && (
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

            {onLabelStep && (frontVisible || backVisible) && (
              <>
                <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr', marginTop: 16 }}>
                  {frontVisible && (
                    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
                      <h4 style={{ marginTop: 0 }}>Front Label</h4>
                      <button className="configurator-button" onClick={() => handleLabelClick('front')}>
                        {labelDesigns.front ? 'Edit Front Label' : 'Design Front Label'}
                      </button>
                    </div>
                  )}
                  {backVisible && (
                    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
                      <h4 style={{ marginTop: 0 }}>Back Label</h4>
                      <button className="configurator-button" onClick={() => handleLabelClick('back')}>
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

