import assert from 'assert';
import { GenericContainer, Network, Wait } from 'testcontainers';
import { Client } from 'pg';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { createCustomerTable, createCustomer, getCustomers } from './customer-repository';

describe('Dummy test', async () => {
  it('should work', async (done) => {
    // do something
    done();
  });
});

describe('Container', () => {
  let container;

  before(async () => {
    container = await new GenericContainer('alpine')
      // .withCommand(["sleep", "infinity"])
      .withCommand(["/bin/sh", "-c", "echo 'Started!' && sleep infinity"])
      .withWaitStrategy(Wait.forLogMessage("Started!"))
      .start();
  });

  after(async () => {
    await container.stop();
  })

  it('create', async () => {
    const { output, exitCode } = await container.exec(['echo', 'hello', 'world']);

    assert.equal(exitCode, 0);
    assert.equal(output, 'hello world\n');
  });
});

describe('Container with network', () => {
  let network;
  let container;

  before(async () => {
    network = await new Network().start();
    container = await new GenericContainer('alpine')
      .withNetwork(network)
      // .withCommand(["sleep", "infinity"])
      .withCommand(["/bin/sh", "-c", "echo 'Started!' && sleep infinity"])
      .withWaitStrategy(Wait.forLogMessage("Started!"))
      .start();
  });

  after(async () => {
    await container.stop();
    await network.stop();
  })

  it('create', async () => {
    const { output, exitCode } = await container.exec(['echo', 'hello', 'world']);

    assert.equal(exitCode, 0);
    assert.equal(output, 'hello world\n');
  });
});

describe('Customer Repository', () => {
  let postgresContainer;
  let postgresClient;
  let network;

  before(async () => {
    network = await new Network().start();
    postgresContainer = await new PostgreSqlContainer()
      .withNetwork(network)
      .withWaitStrategy(Wait.forLogMessage("server started"))
      .start();
    postgresClient = new Client({
      // host: '::1',
      host: postgresContainer.getHost(),
      port: postgresContainer.getPort(),
      database: postgresContainer.getDatabase(),
      user: postgresContainer.getUsername(),
      password: postgresContainer.getPassword(),
    });
    await postgresClient.connect();
    await createCustomerTable(postgresClient);
  });

  after(async () => {
    await postgresClient.end();
    await postgresContainer.stop();
    await network.stop();
  });

  it('should create and return multiple customers', async () => {
    const customer1 = { id: 1, name: 'John Doe' };
    const customer2 = { id: 2, name: 'Jane Doe' };

    await createCustomer(postgresClient, customer1);
    await createCustomer(postgresClient, customer2);

    const customers = await getCustomers(postgresClient);

    assert.deepEqual(customers, [customer1, customer2]);
  });
});
