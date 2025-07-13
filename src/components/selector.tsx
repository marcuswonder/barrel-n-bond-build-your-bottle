import React, { FunctionComponent, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useZakeke } from 'zakeke-configurator-react';
import { List, ListItem, ListItemImage } from './list';

const Container = styled.div`
    height: 100%;
    overflow: auto;
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
        setCamera,
    } = useZakeke();

    // console.log("selectOption", selectOption)
    // console.log("groups", groups)

    const [selectedGroupId, selectGroup] = useState<number | null>(null);
    const [selectedStepId, selectStep] = useState<number | null>(null);
    const [selectedAttributeId, selectAttribute] = useState<number | null>(null);
    
    const selectedGroup = groups.find(group => group.id === selectedGroupId);
    // console.log("selectedGroup", selectedGroup)

    const selectedStep = selectedGroup ? selectedGroup.steps.find(step => step.id === selectedStepId) : null;
    // console.log("selectedStep", selectedStep)

    const attributes = useMemo(() => (selectedStep || selectedGroup)?.attributes ?? [], [selectedGroup, selectedStep]);
    const selectedAttribute = attributes.find(attribute => attribute.id === selectedAttributeId);
    // console.log("selectedAttribute", selectedAttribute)

    useEffect(() => {
        if (!selectedGroup && groups.length > 0) {
            const bottleGroup = groups.find(g => g.name === 'Build Your Bottle');
            const groupToSelect = bottleGroup || groups[0];

            selectGroup(groupToSelect.id);

            if (groupToSelect.steps.length > 0)
                selectStep(groupToSelect.steps[0].id);

            if (templates.length > 0)
                setTemplate(templates[0].id);

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

    return <Container>


        {/* Steps */}
        {selectedGroup && selectedGroup.steps.length > 0 && <List>
            {selectedGroup.steps.map(step => (
                <ListItem key={step.id} onClick={() => selectStep(step.id)} selected={selectedStep === step}>
                    {step.name}
                </ListItem>
            ))}
        </List>}

        {/* Attributes */}
        {/* <List>
            
            {attributes
                .filter(attribute => attribute.enabled)
                .map(attribute => (
                    <ListItem
                        key={attribute.id}
                        onClick={() => selectAttribute(attribute.id)}
                        selected={selectedAttribute === attribute}
                    >
                        Attribute: {attribute.name}
                    </ListItem>
                ))}
        </List> */}
        
        {/* Options */}
        <List>
            {selectedAttribute && selectedAttribute.options
                .filter(() => true)
                .map(option => (
                    option.name !== "No Selection" && (
                    <ListItem key={option.id} onClick={() => {
                        console.log('User selected option:', {
                            name: option.name,
                            attribute: selectedAttribute.name,
                            enabled: option.enabled,
                            selected: option.selected
                        });
                        selectOption(option.id);
                    }} selected={option.selected}>
                        {option.imageUrl && <ListItemImage src={option.imageUrl} />}
                        {option.name}
                    </ListItem>
                    )
                ))}
        </List>

        <h3>Price: {price}</h3>
        {isAddToCartLoading ? 'Saving...next step: create your label' : <button onClick={addToCart}>Save and Create Label</button>}
    </Container>
}

export default Selector;