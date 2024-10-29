import { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import childProcess from 'node:child_process';

type ProcessState = {
  state: 'in_progress'
} | {
  state: 'error'
  error: string
} | {
  state: 'done'
}

type Props = {
  command: string;
  args: string[];
  env?: Record<string, string>;
  doneMessage?: string;
  onDone: () => void;
};

export const SpawnProcess = ({ command, args, env, doneMessage, onDone }: Props) => {
  const [output, setOutput] = useState('');
  const [processState, setProcessState] = useState<ProcessState>({ state: 'in_progress' });

  const commandText = `${command} ${args.join(' ')}`;

  useEffect(() => {
    const subProcess = childProcess.spawn(command, args, {
      env: {
        ...process.env,
        ...env,
      },
    });
    subProcess.on('close', () => {
      setProcessState({ state: 'done' });
      onDone();
    });

    subProcess.stderr?.on('data', (output: Buffer) => {
      setProcessState({ state: 'error', error: output.toString('utf8') });
    });

    subProcess.stdout?.on('data', (output: Buffer) => {
      setOutput(output.toString('utf8'));
    });

    return () => {
      subProcess.kill();
    };
  }, []);

  return (
    <Box flexDirection='column' marginY={1}>
      <Box flexDirection='row' gap={3}>
        <Text italic>{commandText}</Text>
        {processState.state === 'done' && <Text color='green'>Done!</Text>}
        {processState.state === 'error' && <Text color='red'>{processState.error}</Text>}
      </Box>
      <Box>
        {processState.state === 'in_progress' && <Text dimColor>{output}</Text>}
      </Box>
      {processState.state === 'done' && doneMessage && (
        <Box marginLeft={5}>
          <Text>{doneMessage}</Text>
        </Box>
      )}
    </Box>
  );
};