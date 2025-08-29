"use client";
import React, { forwardRef } from 'react';
import styled from 'styled-components';

export type MessageInputFancyProps = {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  name?: string;
  onSend?: () => void;
};

const MessageInputFancy = forwardRef<HTMLInputElement, MessageInputFancyProps>(
  ({ value, onChange, placeholder, disabled, onKeyDown, name = 'message', onSend }, ref) => {
    return (
      <StyledWrapper>
        <div>
          <div id="poda">
            <div className="glow" />
            <div className="darkBorderBg" />
            <div className="darkBorderBg" />
            <div className="darkBorderBg" />
            <div className="white" />
            <div className="border" />
            <div id="main">
              <input
                ref={ref}
                placeholder={placeholder || 'Message...'}
                type="text"
                name={name}
                className="input"
                value={value}
                onChange={onChange}
                disabled={disabled}
                onKeyDown={onKeyDown}
              />
              <div id="input-mask" />
              <div id="pink-mask" />
              {!disabled && (
                <button id="send-icon" type="button" aria-label="Send" onClick={onSend}>
                  <svg xmlns="http://www.w3.org/2000/svg" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="url(#sendg)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <defs>
                      <linearGradient id="sendg" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#f8e7f8" />
                        <stop offset="50%" stopColor="#b6a9b7" />
                      </linearGradient>
                    </defs>
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </StyledWrapper>
    );
  }
);
MessageInputFancy.displayName = 'MessageInputFancy';

const StyledWrapper = styled.div`
  display: block;
  width: 100%;
  flex: 1 1 auto;
  /* removed background grid to prevent visual stretching */
  #poda { position: relative; width: 100%; height: 56px; }
  #main { position: relative; width: 100%; height: 56px; }

  .white,
  .border,
  .darkBorderBg,
  .glow {
    height: 100%;
    width: 100%;
    position: absolute;
    overflow: hidden;
    z-index: -1;
    border-radius: 12px;
    filter: blur(3px);
  }
  .input {
    background-color: #010201;
    border: none;
    width: 100%;
    height: 56px;
    border-radius: 10px;
    color: white;
    padding: 0 52px 0 16px;
    font-size: 18px;
    position: relative;
    z-index: 2; /* keep text above masks */
  }
  #poda {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .input::placeholder {
    color: #c0b9c0;
  }
  .input:focus { outline: none; }
  #main:focus-within > #input-mask { display: none; }
  #input-mask {
    pointer-events: none;
    width: 100px;
    height: 20px;
    position: absolute;
    background: linear-gradient(90deg, transparent, black);
    top: 18px;
    left: 20px;
    z-index: 0; /* below input */
  }
  #pink-mask {
    pointer-events: none;
    width: 30px;
    height: 20px;
    position: absolute;
    background: #cf30aa;
    top: 10px;
    left: 5px;
    filter: blur(20px);
    opacity: 0.8;
    transition: all 2s;
    z-index: 0; /* below input */
  }
  #main:hover > #pink-mask { opacity: 0; }
  .white {
    max-height: 63px;
    max-width: 307px;
    border-radius: 10px;
    filter: blur(2px);
  }
  .white::before {
    content: "";
    z-index: -2;
    text-align: center;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(83deg);
    position: absolute;
    width: 600px;
    height: 600px;
    background-repeat: no-repeat;
    background-position: 0 0;
    filter: brightness(1.4);
    background-image: conic-gradient(
      rgba(0, 0, 0, 0) 0%,
      #a099d8,
      rgba(0, 0, 0, 0) 8%,
      rgba(0, 0, 0, 0) 50%,
      #dfa2da,
      rgba(0, 0, 0, 0) 58%
    );
    transition: all 2s;
  }
  .border {
    max-height: 59px;
    max-width: 303px;
    border-radius: 11px;
    filter: blur(0.5px);
  }
  .border::before {
    content: "";
    z-index: -2;
    text-align: center;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(70deg);
    position: absolute;
    width: 600px;
    height: 600px;
    filter: brightness(1.3);
    background-repeat: no-repeat;
    background-position: 0 0;
    background-image: conic-gradient(
      #1c191c,
      #402fb5 5%,
      #1c191c 14%,
      #1c191c 50%,
      #cf30aa 60%,
      #1c191c 64%
    );
    transition: all 2s;
  }
  .darkBorderBg { max-height: 65px; max-width: 312px; }
  .darkBorderBg::before {
    content: "";
    z-index: -2;
    text-align: center;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(82deg);
    position: absolute;
    width: 600px;
    height: 600px;
    background-repeat: no-repeat;
    background-position: 0 0;
    background-image: conic-gradient(
      rgba(0, 0, 0, 0),
      #18116a,
      rgba(0, 0, 0, 0) 10%,
      rgba(0, 0, 0, 0) 50%,
      #6e1b60,
      rgba(0, 0, 0, 0) 60%
    );
    transition: all 2s;
  }
  /* disable hover/focus rotation animations to keep size stable */
  .glow { overflow: hidden; filter: blur(30px); opacity: 0.4; }
  .glow:before {
    content: "";
    z-index: -2;
    text-align: center;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(60deg);
    position: absolute;
    width: 999px;
    height: 999px;
    background-repeat: no-repeat;
    background-position: 0 0;
    background-image: conic-gradient(
      #000,
      #402fb5 5%,
      #000 38%,
      #000 50%,
      #cf30aa 60%,
      #000 87%
    );
    transition: all 2s;
  }
  @keyframes rotate { 100% { transform: translate(-50%, -50%) rotate(450deg); } }
  #send-icon {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
    height: 40px;
    width: 40px;
    border-radius: 10px;
    background: linear-gradient(180deg, #161329, black, #1d1b4b);
    border: 1px solid transparent;
    cursor: pointer;
  }
  #main { position: relative; }
  /* removed search icon */
`

export default MessageInputFancy
