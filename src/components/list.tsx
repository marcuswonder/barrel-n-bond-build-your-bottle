import React from 'react';
import styled from "styled-components";

const getContrastText = (hex?: string) => {
  if (!hex) return '#fff';
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return '#fff';
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#000' : '#fff';
};

// Option item – for attribute selections with images
export const OptionListItem = styled.li<{
  $selected?: boolean;
  $disabled?: boolean;
  $width?: string;
}>`
  --cut: 24px;
  --b: 6px;
  --bc: #ff3df2;
  --bg: #000;

  position: relative;
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 0;
  font-size: 13px;
  width: ${({ $width }) => $width || '200px'};
  height: 100%;
  border: 0;
  background: var(--bc);
  color: #fff;
  clip-path: polygon(
    var(--cut) 0,
    100% 0,
    100% calc(100% - var(--cut)),
    calc(100% - var(--cut)) 100%,
    0 100%,
    0 var(--cut)
  );
  transform: translateZ(0);
  transform-style: preserve-3d;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  gap: 16px;
  box-shadow: ${({ $selected }) => ($selected ? '0 0 0 2px #fff' : 'none')};
  opacity: ${({ $disabled }) => ($disabled ? 0.6 : 1)};
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  outline: none;

  &::before {
    content: "";
    position: absolute;
    inset: calc(var(--b) - 1px);
    background: var(--bg);
    clip-path: polygon(
      calc(var(--cut) - var(--b) + 1px) 0,
      100% 0,
      100% calc(100% - (var(--cut) - var(--b) + 1px)),
      calc(100% - (var(--cut) - var(--b) + 1px)) 100%,
      0 100%,
      0 calc(var(--cut) - var(--b) + 1px)
    );
    transform: translateZ(0);
    pointer-events: none;
  }

  &::after {
    content: none;
    display: none;
  }

  &:hover {
    ${({ $disabled }) => ($disabled ? 'transform: none; box-shadow: none;' : 'transform: translateY(-2px);')}
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 768px) and (orientation: portrait) {
    padding: 0;
    font-size: .75rem;
    flex-direction: row;
    justify-content: center;
    gap: 2px;
    width: auto;
  }
`;


export const NavButton = styled.button`
  background: none;
  border: none;
  font-size: 36px;
  cursor: pointer;
  padding: 4px 12px;
  color: #fff;
  transition: color 0.2s ease, opacity 0.2s ease;

  &:hover:not(:disabled) {
    color: #f42492;
  }

  &:disabled {
    opacity: 1;
    color: #777;
    cursor: default;
  }
`;


export const StepTitle = styled.h2`
  margin: 0 16px;
  text-align: center;
  flex-grow: 1;
  font-size: 18px;
  font-weight: 600;
`;

export const LoadingSpinner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  max-height: 100%;

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

export const CartButton = styled.button.attrs({ className: 'configurator-button' })`
  width: 100%;
  margin: 0;
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
  display: flex;
  flex-direction: column;
  position: relative;
  height: 100%;
  max-height: 100%;
`;

export const ContentWrapper = styled.div`
  position: relative;
`;

export const Container = styled.div`
  border-top: 6px solid black;
  padding: 24px;
  padding-top: calc(24px + var(--safe-top));
  padding-bottom: 24px;
  box-sizing: border-box;

  @media (max-width: 767px) {
    padding: 16px;
    padding-top: calc(16px + var(--safe-top));
    padding-bottom: 16px;
  }
`;


export const NotesWrapper = styled.div<{ $accent?: string }>`
  --notes-accent: ${({ $accent }) => ($accent ? $accent : 'gray')};

  margin-top: 24px;
  padding: 16px;
  background-color: transparent;
  border: 2px solid var(--notes-accent);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  strong {
    display: block;
  }

  p {
    margin: 8px 0 0;
    color: #c7c7c7;
  }

  @media (max-width: 767px) {
    margin-top: 0px;
    padding: 0px;
    height: 0;
    display:none;
  }
`;


export const CartBarContainer = styled.div`
  position: sticky;
  bottom: 0;
  background: #000;
  padding: 8px 16px 12px;
  z-index: 100;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.06);

  @supports (padding-bottom: env(safe-area-inset-bottom)) {
    padding-bottom: calc(12px + env(safe-area-inset-bottom));
  }
`;

export const CartBarInner = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

// Reusable CartBar component
export const CartBar: React.FC<{
  price: React.ReactNode;
  showButton: boolean;
  loading?: boolean;
  onAdd: () => void;
  renderSpinner?: React.ReactNode;
}> = ({ price: _price, showButton, loading, onAdd, renderSpinner }) => {
  if (!showButton) return null;
  return (
    <CartBarContainer>
      <CartBarInner>
        <CartButton onClick={onAdd} disabled={!!loading}>
          {loading ? (renderSpinner ?? <span>…</span>) : <span>Save and Order</span>}
        </CartButton>
      </CartBarInner>
    </CartBarContainer>
  );
};

export const ViewportSpacer = styled.div`
  flex: 0 0 auto;
  height: 0;

  @supports (height: env(safe-area-inset-bottom)) {
    height: env(safe-area-inset-bottom);
  }
`;

export const NavContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 16px 0;
`;

export const StepNavContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 16px 0;
`;

export const StepNavCenter = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;

  span {
    font-size: 12px;
    color: #888;
    margin-top: 4px;
  }
`;

export const StepNav: React.FC<{
  title: React.ReactNode;
  stepIndex: number;         // zero-based
  totalSteps: number;
  onPrev: () => void;
  onNext: () => void;
  disablePrev?: boolean;
  disableNext?: boolean;
}> = ({ title, stepIndex, totalSteps, onPrev, onNext, disablePrev, disableNext }) => (
  <StepNavContainer>
    <NavButton onClick={onPrev} disabled={!!disablePrev} data-tooltip="Back">←</NavButton>

    <StepNavCenter>
      <StepTitle>{title}</StepTitle>
      <span>Step {stepIndex + 1} of {totalSteps}</span>
    </StepNavCenter>

    <NavButton onClick={onNext} disabled={!!disableNext} data-tooltip="Next">→</NavButton>
  </StepNavContainer>
);

// ===== Reusable UI blocks =====

// Options list layout
export const OptionsWrap = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
  list-style: none;
  margin: 0;
  padding: 0;

  & > li:nth-child(1) {
    --bc: #f42492;
  }

  & > li:nth-child(2) {
    --bc: #f9f02c;
  }

  & > li:nth-child(3) {
    --bc: #24e2f3;
  }

  & > li:nth-child(4) {
    --bc: #4e3fbb;
  }

  & > li:nth-child(5) {
    --bc: #f1211b;
  }

  & > li:nth-child(6) {
    --bc: #b2ef3e;
  }

  & > li:nth-child(7) {
    --bc: #29c396;
  }

  & > li:nth-child(8) {
    --bc: #f69027;
  }

  & > li:nth-child(9) {
    --bc: #20a0de;
  }
`;

// Text inside an option card
export const OptionText = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  background: transparent;
  color: #fff;
  padding: 22px;
`;

export const OptionTitle = styled.span<{ $selected?: boolean }>`
  display: inline-block;
  padding-bottom: 0.4rem;
  border-bottom: 2px solid var(--bc);
  font-weight: 600;
  color: ${({ $selected }) => ($selected ? '#fff' : 'inherit')};
`;

export const OptionDescription = styled.span`
  font-size: 13px;
  color: #cfcfcf;
  margin-top: 4px;
`;

// Closure step sections
export const ClosureSections = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 8px;
`;

export const SectionTitle = styled.h4`
  margin: 0 0 8px;
`;

export const SwatchGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
  gap: 12px;
`;

export const SwatchButton = styled.button<{
  $selected?: boolean;
  $hex?: string;
  $isNone?: boolean;
  $disabled?: boolean;
}>`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: ${({ $selected, $isNone }) => {
    if ($isNone) return '1px solid #fff';
    return $selected ? '2px solid #f42492' : '1px solid #fff';
  }};
  background: ${({ $isNone, $hex }) => ($isNone ? 'transparent' : ($hex || 'transparent'))};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  overflow: hidden;

  &::after {
    content: attr(data-swatch-label);
    position: absolute;
    inset: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    line-height: 1.1;
    letter-spacing: 0.03rem;
    text-transform: none;
    color: ${({ $hex, $isNone }) => ($isNone ? '#fff' : getContrastText($hex))};
    text-shadow: none;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &:hover::after {
    opacity: 1;
  }
`;

export const SwatchNoneLabel = styled.span`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #fff;
`;

// Label step cards
export const LabelGrid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr 1fr;
  margin-top: 16px;
`;

export const LabelCard = styled.div`
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
`;

export const LabelCardTitle = styled.h4`
  margin-top: 0;
`;

export const ActionsCenter = styled.div`
  margin-top: 12px;
  display: flex;
  justify-content: center;

  & .configurator-button,
  & .wizard-ghost {
    width: auto;
  }

  flex-wrap: wrap;
`;

// Label design form (AI)
export const LabelDesignWrap = styled.div`
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const LabelTabs = styled.div`
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
`;

export const LabelTabButton = styled.button<{ $active?: boolean }>`
  border: 1px solid ${({ $active }) => ($active ? '#ff73c6' : '#444')};
  background: ${({ $active }) => ($active ? 'linear-gradient(180deg, #2a2a2a 0%, #141414 100%)' : 'transparent')};
  border-radius: 10px;
  box-shadow: ${({ $active }) => ($active ? '0 6px 14px rgba(244, 36, 146, 0.25)' : 'none')};
  color: #fff;
  padding: 8px 12px;
  font-size: 12px;
  letter-spacing: 0.08rem;
  cursor: pointer;
  text-transform: uppercase;
  transition: border-color 150ms ease, background-color 150ms ease;

  &:hover {
    border-color: #f42492;
  }
`;

export const LabelForm = styled.form`
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const LabelDetails = styled.details`
  border: 1px solid #222;
  padding: 8px 12px;
  background: #0c0c0c;
  margin-bottom: 8px;
`;

export const LabelSummary = styled.summary`
  cursor: pointer;
  list-style: none;
  font-size: 12px;
  letter-spacing: 0.08rem;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  &::-webkit-details-marker {
    display: none;
  }
`;

export const LabelSummaryMeta = styled.span`
  font-size: 12px;
  color: #bbb;
  text-transform: none;
`;

export const LabelRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
`;

export const LabelRowTight = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
`;

export const LabelField = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  letter-spacing: 0.05rem;
`;

export const LabelInput = styled.input`
  border: 1px solid #333;
  background: #111;
  color: #fff;
  padding: 10px 12px;
  font-size: 14px;
  outline: none;

  &[type="color"] {
    padding: 0;
    height: 40px;
    background: transparent;
    border: 1px solid #333;
    cursor: pointer;
  }

  &[type="color"]::-webkit-color-swatch-wrapper {
    padding: 0;
  }

  &[type="color"]::-webkit-color-swatch {
    border: none;
  }

  &[type="file"] {
    padding: 8px 10px;
  }

  &[type="file"]::file-selector-button {
    margin-right: 10px;
    padding: 8px 12px;
    border: 1px solid #ff73c6;
    background: linear-gradient(180deg, #ff4fb3 0%, #f42492 60%, #d81f7f 100%);
    color: #fff;
    letter-spacing: 0.08rem;
    font-size: 11px;
    cursor: pointer;
  }

  &[type="file"]::-webkit-file-upload-button {
    margin-right: 10px;
    padding: 8px 12px;
    border: 1px solid #ff73c6;
    background: linear-gradient(180deg, #ff4fb3 0%, #f42492 60%, #d81f7f 100%);
    color: #fff;
    letter-spacing: 0.08rem;
    font-size: 11px;
    cursor: pointer;
  }
`;

export const LabelTextarea = styled.textarea`
  border: 1px solid #333;
  background: #111;
  color: #fff;
  padding: 10px 12px;
  font-size: 14px;
  min-height: 120px;
  resize: vertical;
  outline: none;
`;

export const LabelDescription = styled.span`
  font-size: 12px;
  color: #bbb;
`;

export const LabelHelperText = styled.span`
  font-size: 11px;
  color: #aaa;
`;

export const FileNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #bbb;
`;

export const FileRemoveButton = styled.button`
  background: transparent;
  border: 1px solid #444;
  color: #fff;
  width: 22px;
  height: 22px;
  line-height: 20px;
  text-align: center;
  cursor: pointer;
`;

export const LabelCheckboxRow = styled.label`
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 12px;
  color: #ddd;
`;

export const WizardWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const WizardStepTitle = styled.h4`
  margin: 0;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.08rem;
`;

export const WizardOptions = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 6px;
`;

export const WizardOptionButton = styled.button<{ $active?: boolean }>`
  border: 1px solid ${({ $active }) => ($active ? '#ff73c6' : '#333')};
  background: ${({ $active }) => ($active ? 'linear-gradient(180deg, #ff4fb3 0%, #f42492 70%)' : 'transparent')};
  border-radius: 10px;
  box-shadow: ${({ $active }) => ($active ? '0 10px 20px rgba(244, 36, 146, 0.3)' : 'none')};
  color: #fff;
  padding: 10px 12px;
  font-size: 12px;
  cursor: pointer;
  text-align: left;
  transition: border-color 150ms ease, background-color 150ms ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover {
    border-color: #f42492;
  }
`;

export const WizardNav = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;

  & .configurator-button,
  & .wizard-ghost {
    width: auto;
  }

  flex-wrap: wrap;
`;

export const GuidedActionRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;

  & .configurator-button,
  & .wizard-ghost {
    width: auto;
  }

  flex-wrap: wrap;

  & .guided-action {
    flex: 0 1 240px;
    width: 240px;
    max-width: 100%;
  }
`;

export const LabelPreviewImage = styled.img`
  width: 100%;
  max-width: 520px;
  border: 1px solid #222;
  background: #0b0b0b;
  display: block;
  user-select: none;
`;

export const WizardHeader = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 8px;
`;

export const WizardHeaderSide = styled.div<{ $align?: 'left' | 'right' }>`
  display: flex;
  justify-content: ${({ $align }) => ($align === 'right' ? 'flex-end' : 'flex-start')};
  gap: 8px;
`;

export const RestartButton = styled.button`
  background: transparent;
  border: none;
  color: #fff;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;

  span {
    font-size: 20px;
    line-height: 1;
  }
`;

export const PromptLoading = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: #fff;
  text-align: center;
  min-height: 48px;
`;

export const PromptFadeText = styled.div`
  animation: promptFade 3.5s ease-in-out infinite;

  @keyframes promptFade {
    0% { opacity: 0; }
    15% { opacity: 1; }
    50% { opacity: 1; }
    85% { opacity: 0; }
    100% { opacity: 0; }
  }
`;

export const PromptSpinner = styled.div`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: #ff4fb3;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

// Accessible live region for config warnings
export const VisuallyHiddenLive = styled.div`
  position: absolute !important;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
`;

export const ConfigWarning: React.FC = () => (
  <VisuallyHiddenLive id="config-warning" aria-live="polite" role="status" />
);
