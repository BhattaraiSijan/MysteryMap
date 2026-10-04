import { useEffect, useId, useRef, useState } from "react";

export type CountryPickerProps = {
  names: { code: string; name: string }[];
  onPick: (code: string) => void;
};

const MAX_SHOWN = 8;

/** The keyboard route to the map: a labelled combobox listing every country. */
export function CountryPicker({ names, onPick }: CountryPickerProps) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputId = useId();
  const listId = useId();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  useEffect(() => cancelClose, []);

  const query = text.trim().toLowerCase();
  const matches = query
    ? names
        .filter((n) => n.name.toLowerCase().includes(query))
        .sort((a, b) => Number(!a.name.toLowerCase().startsWith(query)) - Number(!b.name.toLowerCase().startsWith(query)))
        .slice(0, MAX_SHOWN)
    : [];

  const choose = (code: string) => {
    cancelClose();
    onPick(code);
    setText("");
    setOpen(false);
    setActive(0);
  };

  return (
    <div className="country-picker">
      <label htmlFor={inputId}>Find a country</label>
      <input
        id={inputId}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open && matches.length > 0}
        aria-controls={listId}
        aria-activedescendant={open && matches[active] ? `${listId}-${matches[active].code}` : undefined}
        value={text}
        placeholder="Type a country name"
        onChange={(e) => {
          cancelClose();
          setText(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => {
          cancelClose();
          setOpen(true);
        }}
        onBlur={() => {
          cancelClose();
          closeTimer.current = setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && matches[active]) {
            e.preventDefault();
            choose(matches[active].code);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      <ul id={listId} role="listbox" className="country-options" hidden={!open || matches.length === 0}>
        {matches.map((m, i) => (
          <li
            key={m.code}
            id={`${listId}-${m.code}`}
            role="option"
            aria-selected={i === active}
            className={i === active ? "active" : undefined}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => choose(m.code)}
          >
            {m.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
