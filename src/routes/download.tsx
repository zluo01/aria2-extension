import { getJobDetail, getPlatformInfo, saveFile } from '@/browser';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useDownloadMutation } from '@/lib/queries';
import { parseBytes, verifyFileName } from '@/utils';
import { useForm } from '@tanstack/react-form';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/download')({
  loader: async () => getJobDetail(),
  component: DownloadPanel,
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

  const form = useForm({
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
      <div className="size-full p-4">
        <FieldGroup>
          <FieldSet>
            <FieldGroup className="gap-y-1.5">
              <form.Field
                name="fileName"
                validators={{
                  onChangeAsync: async ({ value }) => {
                    const platformOs = await getPlatformInfo();
                    return verifyFileName(value, platformOs.os)
                      ? undefined
                      : { message: 'Invalid file name.' };
                  },
                }}
              >
                {field => {
                  const isInvalid = !field.state.meta.isValid;
                  return (
                    <Field
                      className="gap-0"
                      data-invalid={!field.state.meta.isValid}
                    >
                      <FieldLabel
                        className="text-sm text-muted-foreground"
                        htmlFor={field.name}
                      >
                        File Name
                      </FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={e => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        autoComplete="off"
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </form.Field>
              <form.Field name="filePath">
                {field => (
                  <Field
                    className="gap-0"
                    data-invalid={!field.state.meta.isValid}
                  >
                    <FieldLabel
                      className="text-sm text-muted-foreground"
                      htmlFor={field.name}
                    >
                      File Path
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={e => field.handleChange(e.target.value)}
                      autoComplete="off"
                      required
                    />
                  </Field>
                )}
              </form.Field>
              <Field className="gap-0">
                <FieldLabel className="text-sm text-muted-foreground">
                  From
                </FieldLabel>
                <Input value={data.url} disabled />
              </Field>
              <div className="flex flex-row justify-end items-center">
                <span className="text-xs text-muted-foreground">
                  {data.fileSize > 0 ? parseBytes(data.fileSize) : 'UNKNOWN B'}
                </span>
              </div>
              <Field>
                <Textarea
                  value={data.header}
                  className="resize-none"
                  disabled
                />
              </Field>
              <form.Subscribe
                selector={state => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, _isSubmitting]) => (
                  <Field
                    orientation="horizontal"
                    className="justify-between mt-1"
                  >
                    <Button
                      className="w-32"
                      type="submit"
                      disabled={!canSubmit}
                      onClick={() =>
                        form.handleSubmit({ submitAction: 'download' })
                      }
                    >
                      Download
                    </Button>
                    <Button
                      className="w-32"
                      type="submit"
                      disabled={!canSubmit}
                      onClick={() =>
                        form.handleSubmit({ submitAction: 'save' })
                      }
                    >
                      Save
                    </Button>
                    <Button
                      className="w-32"
                      type="submit"
                      disabled={!canSubmit}
                      onClick={() =>
                        form.handleSubmit({ submitAction: 'saveAs' })
                      }
                    >
                      Save As
                    </Button>
                  </Field>
                )}
              </form.Subscribe>
            </FieldGroup>
          </FieldSet>
        </FieldGroup>
      </div>
    </form>
  );
}
