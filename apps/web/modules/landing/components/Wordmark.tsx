import classNames from "classnames";

type WordmarkProps = {
  className?: string;
};

// The lockup SVG is 96.593 x 26; width and height are set so the header does not shift while it loads.
export function Wordmark({ className }: WordmarkProps) {
  return (
    <>
      <img
        src="/tikket/wordmark.svg"
        alt="Tikket"
        width={97}
        height={26}
        className={classNames("block w-auto dark:hidden", className)}
      />
      <img
        src="/tikket/wordmark-white.svg"
        alt="Tikket"
        width={97}
        height={26}
        className={classNames("hidden w-auto dark:block", className)}
      />
    </>
  );
}
