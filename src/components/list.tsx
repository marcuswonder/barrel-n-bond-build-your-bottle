import styled from "styled-components";

export const List = styled.ul`
    margin: 0;
    padding: 0;
    display: flex;
    align-items: center;
    margin-bottom: 40px;
    flex-wrap:wrap; 
`;

// Step item – for bottle/liquid/closure steps
export const StepListItem = styled.li<{ selected?: boolean }>`
  padding: 12px 16px;
  font-weight: 500;
  font-size: 16px;
  border-left: ${({ selected }) => (selected ? '4px solid #000' : '4px solid transparent')};
  background-color: ${({ selected }) => (selected ? '#f3f4f6' : 'transparent')};
  cursor: pointer;

  &:hover {
    background-color: #f9fafb;
  }
`;

// Option item – for attribute selections with images
export const OptionListItem = styled.li<{ selected?: boolean }>`
  display: flex;
  align-items: center;
  padding: 16px;
  margin-bottom: 12px;
  border-radius: 12px;
  border: 1px solid ${({ selected }) => (selected ? '#000' : '#d1d5db')};
  background-color: ${({ selected }) => (selected ? '#000' : '#fff')};
  color: ${({ selected }) => (selected ? '#fff' : '#000')};
  cursor: pointer;
  gap: 16px;
  box-shadow: ${({ selected }) =>
    selected ? '0 6px 12px rgba(0, 0, 0, 0.2)' : '0 2px 6px rgba(0, 0, 0, 0.1)'};
  transition: all 0.2s ease;
  transform-style: preserve-3d;

  &:hover {
    background-color: ${({ selected }) => (selected ? '#111' : '#f0f0f0')};
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
  }

  &:active {
    transform: translateY(0px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
`;


export const ListItemImage = styled.img`
    width: 64px;
    height: 64px;
    object-fit: contain;
    margin-bottom: 20px;
`

export const NavButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 4px 12px;
  color: #333;
  transition: color 0.2s ease;

  &:hover:not(:disabled) {
    color: #000;
  }

  &:disabled {
    opacity: 0.2;
    cursor: default;
  }
`;


export const StepTitle = styled.h2`
  margin: 0 16px;
  text-align: center;
  flex-grow: 1;
  font-size: 20px;
  font-weight: 600;
`;