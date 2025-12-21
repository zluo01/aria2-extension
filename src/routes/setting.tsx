import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  getConfigurationQueryOptions,
  useUpdateConfigMutation,
} from '@/lib/queries';
import { useTheme } from '@/lib/theme';
import manifest from '@/manifest';
import { IConfig } from '@/types';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { ChangeEvent } from 'react';

export const Route = createFileRoute('/setting')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(getConfigurationQueryOptions),
  component: Setting,
});

const protocol = {
  ws: 'WebSocket',
  wss: 'WebSocket (Security)',
  http: 'Http',
  https: 'Https',
};

function Setting() {
  const { theme, setTheme } = useTheme();

  const { data: config } = useSuspenseQuery(getConfigurationQueryOptions);
  const updateConfigMutation = useUpdateConfigMutation();

  async function updateDownloadPath(
    e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
  ): Promise<void> {
    if (config) {
      await updateConfig({ ...config, path: e.target.value });
    }
  }

  async function updateHost(
    e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
  ): Promise<void> {
    if (config) {
      await updateConfig({ ...config, host: e.target.value });
    }
  }

  async function updatePort(
    e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
  ): Promise<void> {
    if (config) {
      await updateConfig({ ...config, port: parseInt(e.target.value) });
    }
  }

  async function updateToken(
    e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
  ): Promise<void> {
    if (config) {
      await updateConfig({ ...config, token: e.target.value });
    }
  }

  async function updateProtocol(protocol: string): Promise<void> {
    if (config) {
      await updateConfig({ ...config, protocol });
    }
  }

  async function updateConfig(config: IConfig) {
    try {
      updateConfigMutation.mutate(config);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="h-screen w-screen flex justify-center">
      <div className="max-w-4xl w-full p-4">
        <FieldGroup>
          <FieldSet>
            <FieldGroup>
              <Field>
                <FieldLabel>Theme</FieldLabel>
                <Select onValueChange={setTheme} value={theme}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={'light'}>Light</SelectItem>
                    <SelectItem value={'dark'}>Dark</SelectItem>
                    <SelectItem value={'system'}>System</SelectItem>
                  </SelectContent>
                </Select>
                <FieldDescription>Please select prefer theme</FieldDescription>
              </Field>
              <Field>
                <FieldLabel>Default Download Path</FieldLabel>
                <Input value={config?.path} onChange={updateDownloadPath} />
                <FieldDescription>
                  Download path of Aria2(only), optional
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel>Protocol</FieldLabel>
                <Select onValueChange={updateProtocol} value={config?.protocol}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(protocol).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>Please select prefer theme</FieldDescription>
              </Field>
              <Field>
                <FieldLabel>Host</FieldLabel>
                <Input value={config?.host} onChange={updateHost} required />
                <FieldDescription>
                  RPC host of Aria2. You can use ip or domain name.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel>Port</FieldLabel>
                <Input value={config?.port} onChange={updatePort} required />
                <FieldDescription>Aria2 RPC port</FieldDescription>
              </Field>
              <Field>
                <FieldLabel>Token</FieldLabel>
                <Input value={config?.token} onChange={updateToken} />
                <FieldDescription>Aria2 RPC secret, optional.</FieldDescription>
              </Field>
            </FieldGroup>
          </FieldSet>
        </FieldGroup>
        <Separator className="mt-2" />
        <div className="flex flex-row justify-end items-center">
          <span className="text-sm text-muted-foreground">
            v{manifest.version}
          </span>
        </div>
      </div>
    </div>
  );
}
