const defaultHours = {
  monday: { open: "", close: "", closed: false, is24h: false },
  tuesday: { open: "", close: "", closed: false, is24h: false },
  wednesday: { open: "", close: "", closed: false, is24h: false },
  thursday: { open: "", close: "", closed: false, is24h: false },
  friday: { open: "", close: "", closed: false, is24h: false },
  saturday: { open: "", close: "", closed: false, is24h: false },
  sunday: { open: "", close: "", closed: false, is24h: false },
};

export const normalizeBusinessHours = (hours = {}) => {
  const result = { ...defaultHours };

  for (const day in result) {
    const input = hours?.[day];

    if (!input) continue;

    const isClosed = Boolean(input.closed);
    const is24h = Boolean(input.is24h);

    if (isClosed) {
      result[day] = {
        open: "",
        close: "",
        closed: true,
        is24h: false,
      };
      continue;
    }

    if (is24h) {
      result[day] = {
        open: "00:00",
        close: "23:59",
        closed: false,
        is24h: true,
      };
      continue;
    }

    result[day] = {
      open: input.open || "",
      close: input.close || "",
      closed: false,
      is24h: false,
    };
  }

  return result;
};