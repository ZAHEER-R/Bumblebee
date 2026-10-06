"use client";

type Props = {
  onClick: () => void;
  listening: boolean;
};

export default function VoiceButton({
  onClick,
  listening
}: Props) {

  return (

    <button
      className={
        listening
          ? "mic-btn active"
          : "mic-btn"
      }
      onClick={onClick}
    >

      🎤

    </button>

  );

}