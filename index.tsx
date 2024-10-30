import { useState, useEffect } from 'react';
import { Box, Newline, render, Text,  } from 'ink';
import { execSync } from 'node:child_process';
import { SpawnProcess } from './components/Subprocess.js';
import { PrismaClient } from '@prisma/client';
import { CheckOperation } from './components/CheckOperation.js';
import Fastify from 'fastify';

const WEB_SERVER_PORT = process.env.WEB_SERVER_PORT;

const fastify = Fastify({
  logger: false,
});

fastify.get('/', async function handler () {
  return { status: 'ok' }
})

fastify.listen({
  port: WEB_SERVER_PORT,
}, (err, address) => {
  if (err) {
    console.error(err);
  }
});

const prisma = new PrismaClient();

const NodeVersion = ({ onDone }: { onDone: () => void }) => {
  const nodeVersion = process.versions.node;
  const majorVersion = parseInt(nodeVersion.split('.')[0]);

  useEffect(() => {
    onDone();
  }, []);

  if (majorVersion < 20) {
    return (
      <Text>
        Node.js version:{' '}
        <Text color='red'>{nodeVersion}, it must be 20.x or higher</Text>
      </Text>
    );
  }

  return (
    <Text>
      Node.js version: <Text color='green'>{nodeVersion}</Text>
    </Text>
  );
};

const NpmVersion = ({ onDone }: { onDone: () => void }) => {
  useEffect(() => {
    onDone();
  }, []);

  const npmVersion = execSync('npm -v')
    .toString()
    .replace(/[\n\t\r]/g, '');
  return (
    <Text>
      Npm version: <Text color='green'>{npmVersion}</Text>
    </Text>
  );
};

const Congrats = () => {
  return (
    <Box flexDirection='column' padding={1} borderStyle='classic' borderColor='green'>
      <Text bold color='green'>🎉 Congrats! Your machine is ready for the workshops!</Text>
      <Text>The docker container is already teared down. You don't need to do it manually.</Text>
    </Box>
  );
};

const Cli = () => {
  const [stepIndex, setStepIndex] = useState(0);

  const nextStep = () => {
    setStepIndex((stepIndex) => stepIndex + 1);
  };

  const STEPS = [
    <NodeVersion onDone={nextStep} />,
    <NpmVersion onDone={nextStep} />,
    <SpawnProcess
      command='docker'
      args={['compose', 'up', '-d']}
      env={{
        COMPOSE_STATUS_STDOUT: '1',
      }}
      onDone={nextStep}
      doneMessage='🛫 Your db container is running!'
    />,
    <CheckOperation
      label='Database connection'
      operation={() => prisma.$queryRaw`SELECT 1`}
      // We need to wait for the database to be ready
      retries={150}
      delay={100}
      operationAssertion={() => true}
      messages={{
        success: 'Connected to the database',
        error: 'Cannot connect to the database',
      }}
      onDone={nextStep}
    />,
    <CheckOperation
      label='Can fetch data from the database'
      operation={() => prisma.customer.findMany()}
      // This is expected amount of customers in the database
      operationAssertion={(result) => result.length === 2}
      messages={{
        success: 'Fetched data from the database',
        error: 'Cannot fetch data from the database',
      }}
      onDone={nextStep}
    />,
    <CheckOperation
      label='Web server connection'
      operation={() => fetch(`http://localhost:${WEB_SERVER_PORT}/`, { signal: AbortSignal.timeout(1000) })}
      operationAssertion={async (result) => (await result.json()).status === 'ok'}
      messages={{
        success: 'Web server is running and responding',
        error: 'Web server is not running or not responding',
      }}
      onDone={() => {
        fastify.close();
        nextStep();
      }}
    />,
    <SpawnProcess
      command='docker'
      args={['compose', 'down']}
      onDone={nextStep}
      env={{
        COMPOSE_STATUS_STDOUT: '1',
      }}
      doneMessage='🛬 Your db container is down!'
    />,
    <Congrats />,
  ];

  return (
    <Box flexDirection='column'>
      <Box padding={1} width='50' borderStyle='classic' borderColor='blueBright' marginBottom={1}>
        <Text>
          Hi 👋 This CLI will help you verify if your machine is ready for the workshops.
          <Newline />
          - Run the database container via <Text bold>docker compose</Text> and check if the database is ready.
          <Newline />
          - Check if you have the right Node.js and Npm versions.
        </Text>
      </Box>

      <Box flexDirection='column'>
        {stepIndex + 1 < STEPS.length && <Text dimColor>🚀 Step {stepIndex} of {STEPS.length}</Text>}
        {STEPS.map(
          (step, index) => index <= stepIndex && <Box key={index}>{step}</Box>
        )}
      </Box>
    </Box>
  );
};

const { waitUntilExit } = render(<Cli />, {
  exitOnCtrlC: true,
});

waitUntilExit().then(() => {
  // double check if the server is closed
  fastify.close();
});
