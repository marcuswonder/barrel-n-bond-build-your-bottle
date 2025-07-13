import React, { FunctionComponent, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useZakeke } from 'zakeke-configurator-react';
import { List, ListItem, ListItemImage } from './list';
import { TailSpin } from 'react-loader-spinner';

const Container = styled.div`
    height: 100%;
    overflow: auto;
`;

const CartButton = styled.button`
    background-color: #000;
    color: #fff;
    padding: 12px 24px;
    border: none;
    cursor: pointer;
    font-size: 16px;
`;

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
        setCamera
    } = useZakeke();

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

            // setTemplate(1111111);
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

    if (isSceneLoading || !groups || groups.length === 0)
        return <span>Loading scene...</span>;

    const handleAddToCart = async () => {
    try {
        await addToCart(
            {},
            async (data) => {
                console.log("🧩 Composition data before sending:", data);

                window.postMessage({
                    zakekeMessageType: "AddToCart",
                    message: {
                        composition: data.composition,
                        preview: data.preview,
                        quantity: data.quantity
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

    return (
        <Container>
            {/* Steps */}
            {selectedGroup && selectedGroup.steps.length > 0 && (
                <List>
                    {selectedGroup.steps.map(step => (
                        <ListItem
                            key={step.id}
                            onClick={() => selectStep(step.id)}
                            selected={selectedStep === step}
                        >
                            {step.name}
                        </ListItem>
                    ))}
                </List>
            )}

            {/* Options */}
            <List>
                {selectedAttribute?.options
                    .filter(() => true)
                    .map(option => (
                        option.name !== "No Selection" && (
                            <ListItem
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
                            >
                                {option.imageUrl && <ListItemImage src={option.imageUrl} />}
                                {option.name}
                            </ListItem>
                        )
                    ))}
            </List>

            <h3>Price: {price}</h3>

            <CartButton onClick={handleAddToCart}>
                {isAddToCartLoading
                    ? <TailSpin color="#FFFFFF" height="25px" />
                    : <span>Save and Create Label</span>}
            </CartButton>
        </Container>
    );
};

export default Selector;