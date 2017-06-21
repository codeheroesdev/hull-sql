/* global describe, it */
import { expect, should } from "chai";
import sinon from "sinon";
import moment from "moment";
import stream from "stream";

import SyncAgent from "../server/lib/sync-agent.js";

describe("SyncAgent", () => {

  it("should build the connectionString", () => {
    const syncAgent = new SyncAgent({
      ship: {
        private_settings: {
          db_type: "postgres",
          output_type: "s3",
          query: "SELECT * FROM users",
          db_host: "1.2.3.4",
          db_port: "5433",
          db_name: "hulldb",
          db_user: "hulluser",
          db_password: "hullpwd",
          db_options: "ssl=true",
          import_days: 10
        }
      }
    });

    const url = syncAgent.connectionString();
    expect(url).to.be.equal("postgres://hulluser:hullpwd@1.2.3.4:5433/hulldb?ssl=true");
  });

  it("should build the connectionString without options", () => {
    const syncAgent = new SyncAgent({
      ship: {
        private_settings: {
          db_type: "postgres",
          output_type: "s3",
          query: "SELECT * FROM users",
          db_host: "1.2.3.4",
          db_port: "5433",
          db_name: "hulldb",
          db_user: "hulluser",
          db_password: "hullpwd",
          import_days: 10
        }
      }
    });

    const url = syncAgent.connectionString();
    expect(url).to.be.equal("postgres://hulluser:hullpwd@1.2.3.4:5433/hulldb");
  });

  it("should pass import_start_date to adapter", () => {
    const syncAgent = new SyncAgent({
      ship: {
        private_settings: {
          db_type: "filesystem",
          import_days: 10
        }
      }
    });
    sinon.stub(syncAgent.adapter.in, "runQuery").callsFake(() => {
      return Promise.resolve();
    });

    const wrapQueryStub = sinon.spy(syncAgent.adapter.in, "wrapQuery");
    syncAgent.runQuery("test");

    expect(wrapQueryStub.args[0][1].import_start_date).to.be.equal(moment().subtract(10, "days").format());
  });

  it("should reject sync operation when stream error occurs", (done) => {
    const syncAgent = new SyncAgent({
      client: {
        logger: {
          error: () => {}
        }
      },
      ship: {
        private_settings: {
          db_type: "filesystem",
          import_days: 10
        }
      }
    });
    const mockStream = new stream.Readable();
    mockStream.close = () => {};

    const closeStreamSub = sinon.stub(mockStream, "close");
    const closeConnectionStub = sinon.stub(syncAgent.adapter.in, "closeConnection");

    const results = syncAgent.sync(mockStream, new Date())
      .catch(err => {
        expect(err.message).to.be.equal("Expected");
        done();
      });

    mockStream.emit("error", new Error("Expected"));
    expect(closeStreamSub.callCount).to.be.equal(1);
    expect(closeConnectionStub.callCount).to.be.equal(1);
  });
});