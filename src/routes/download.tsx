import { getJobDetail, saveFile } from '@/browser';
import { useDownloadMutation } from '@/lib/queries';
import { parseBytes, verifyFileName } from '@/utils';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import TextareaAutosize from '@mui/material/TextareaAutosize';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import { useForm } from '@tanstack/react-form';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/download')({
  loader: async () => getJobDetail(),
  component: DownloadPanel,
});

const Panel = styled(Stack)(({ theme }) => ({
  width: '98%',
  height: '100%',
  minWidth: 480,
  minHeight: 320,
  marginLeft: 'auto',
  marginRight: 'auto',
  backgroundColor: theme.palette.background.paper,
}));

const PanelButton = styled(Button)({
  width: 130,
});

type FormMeta = {
  submitAction: 'download' | 'save' | 'saveAs' | null;
};

const defaultMeta: FormMeta = {
  submitAction: null,
};

function DownloadPanel() {
  const data = Route.useLoaderData();

  const mutation = useDownloadMutation();

  const { Field, Subscribe, handleSubmit } = useForm({
    defaultValues: {
      fileName: data.fileName,
      filePath: '',
    },
    onSubmitMeta: defaultMeta,
    onSubmit: async ({ value, meta }) => {
      switch (meta.submitAction) {
        case 'download':
          await downloadFile(
            data.url,
            value.fileName,
            value.filePath,
            data.header as string[],
          );
          break;
        case 'save':
          await saveFile(data.url, value.fileName, false);
          break;
        case 'saveAs':
          await saveFile(data.url, value.fileName, true);
          break;
      }
    },
  });

  async function downloadFile(
    url: string,
    fileName: string,
    filePath: string,
    headers: string[],
  ) {
    mutation.mutate({ url, fileName, filePath, headers });
  }

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <Panel
        direction="column"
        justifyContent="space-around"
        alignItems="center"
        spacing={1}
      >
        <Field
          name="fileName"
          validators={{
            onChangeAsync: async ({ value }) => {
              return (await verifyFileName(value))
                ? undefined
                : 'Invalid file name.';
            },
          }}
        >
          {field => (
            <TextField
              label="File Name"
              error={!field.state.meta.isValid}
              value={field.state.value}
              onChange={e => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              variant="standard"
              margin="dense"
              fullWidth
            />
          )}
        </Field>

        <Field name="filePath">
          {field => (
            <TextField
              required
              label="File Path"
              value={field.state.value}
              onChange={e => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              variant="standard"
              margin="dense"
              fullWidth
            />
          )}
        </Field>
        <TextField
          label="From"
          value={data.url}
          variant="standard"
          margin="dense"
          fullWidth
          disabled
        />
        {data.fileSize > 0 && (
          <Typography
            variant="body2"
            component="span"
            color="textSecondary"
            display="inline"
            align="right"
            sx={{ width: 1 }}
          >
            {parseBytes(data.fileSize)}
          </Typography>
        )}
        <TextareaAutosize
          minRows={6}
          maxRows={6}
          value={data.header}
          style={{ width: '100%' }}
        />

        <Subscribe selector={state => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit, _isSubmitting]) => (
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              spacing={1}
              sx={{ pt: 1, width: 1 }}
            >
              <PanelButton
                type="submit"
                variant="contained"
                color="primary"
                disabled={!canSubmit}
                onClick={() => handleSubmit({ submitAction: 'download' })}
              >
                Download
              </PanelButton>
              <PanelButton
                type="submit"
                variant="contained"
                color="primary"
                disabled={!canSubmit}
                onClick={() => handleSubmit({ submitAction: 'save' })}
              >
                Save
              </PanelButton>
              <PanelButton
                type="submit"
                variant="contained"
                color="primary"
                disabled={!canSubmit}
                onClick={() => handleSubmit({ submitAction: 'saveAs' })}
              >
                Save As
              </PanelButton>
            </Stack>
          )}
        </Subscribe>
      </Panel>
    </form>
  );
}
