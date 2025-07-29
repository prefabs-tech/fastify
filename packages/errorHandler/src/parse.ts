const parse = (
  value: string | undefined,
  fallback: boolean | number | string | undefined,
) => {
  if (value === undefined) {
    return fallback;
  }

  switch (typeof fallback) {
    case "boolean": {
      return !!JSON.parse(value);
    }

    case "number": {
      return JSON.parse(value);
    }

    default: {
      return value;
    }
  }
};

export default parse;
