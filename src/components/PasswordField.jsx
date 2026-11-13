import { useState } from 'react';
import { IconButton, InputAdornment, TextField } from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';

export default function PasswordField({ type = 'password', slotProps, ...props }) {
  const [visible, setVisible] = useState(false);
  return <TextField
    {...props}
    type={visible ? 'text' : type}
    slotProps={{
      ...slotProps,
      input: {
        ...slotProps?.input,
        endAdornment: <>
          {slotProps?.input?.endAdornment}
          <InputAdornment position="end">
          <IconButton
            aria-label={visible ? 'Hide password' : 'Show password'}
            onClick={() => setVisible((current) => !current)}
            onMouseDown={(event) => event.preventDefault()}
            edge="end"
            disabled={props.disabled}
          >
            {visible ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
          </IconButton>
          </InputAdornment>
        </>,
      },
    }}
  />;
}
