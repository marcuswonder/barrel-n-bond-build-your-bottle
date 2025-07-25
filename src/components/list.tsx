import styled from "styled-components";

// export const List = styled.ul`
//     margin: 0;
//     padding: 0;
//     display: flex;
//     align-items: center;
//     margin-bottom: 40px;
//     flex-wrap:wrap; 
// `;

// // Step item – for bottle/liquid/closure steps
// export const StepListItem = styled.li<{ selected?: boolean }>`
//   padding: 12px 16px;
//   font-weight: 500;
//   font-size: 16px;
//   border-left: ${({ selected }) => (selected ? '4px solid #000' : '4px solid transparent')};
//   background-color: ${({ selected }) => (selected ? '#f3f4f6' : 'transparent')};
//   cursor: pointer;

//   &:hover {
//     background-color: #f9fafb;
//   }
// `;

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


// export const ListItemImage = styled.img`
//     width: 64px;
//     height: 64px;
//     object-fit: contain;
//     margin-bottom: 20px;
// `

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

export const LoadingSpinner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;

  &::after {
    content: "";
    width: 40px;
    height: 40px;
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-top: 4px solid #000;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`; 

export const CartButton = styled.button`
  background-color: #000;
  color: #fff;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  transform-style: preserve-3d;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
`;

export const RotateNotice = styled.div`
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.95);
  color: #000;
  font-size: 18px;
  font-weight: 600;
  text-align: center;
  justify-content: center;
  align-items: center;
  padding: 20px;

  @media (max-width: 768px) and (orientation: portrait) {
    display: flex;
  }
`;

export const LayoutWrapper = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
`;

export const ContentWrapper = styled.div`
  flex: 1;
  overflow-y: auto;
`;

export const Container = styled.div`
  height: 100%;
  overflow: auto;
  background: linear-gradient(135deg, #fef3ff 0%, #e3f6ff 100%);
  padding: 24px;
  box-sizing: border-box;
`;


export const PriceWrapper = styled.div`
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  padding: 16px 32px;
  border-top: 1px solid #ccc;
  background: linear-gradient(135deg, #fef3ff 0%, #e3f6ff 100%);
  text-align: left;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
`;