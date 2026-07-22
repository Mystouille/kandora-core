import { Observable, Subject } from "rxjs";
import { HttpsProxyAgent } from "https-proxy-agent";
import { WebSocket } from "ws";
import { Codec } from "./Codec";
import { MessageType } from "./types/enums/MessageType";

export class Connection {
  private readonly messagesSubject = new Subject<any>();
  private readonly errorSubject = new Subject<any>();
  private socket: WebSocket | undefined;
  // Do not open a socket here: the constructor cannot attach an "error"
  // listener in the same tick for the caller, and a socket without one whose
  // handshake fails (e.g. the gateway returning 502) emits an unhandled
  // "error" event that Node throws as an uncaught exception, crashing the
  // whole process. The socket is created — with all listeners — in reconnect().
  constructor(private readonly server: string) {}

  public get messages(): Observable<{
    type: MessageType;
    data: Buffer;
  }> {
    return this.messagesSubject;
  }

  public get errors$(): Observable<any> {
    return this.errorSubject;
  }

  public init(): Promise<void> {
    return this.reconnect();
  }

  public reconnect(): Promise<void> {
    if (
      this.socket &&
      this.socket.readyState !== WebSocket.CLOSED &&
      this.socket.readyState !== WebSocket.CLOSING
    ) {
      this.socket.terminate();
    }

    //console.log("Connecting to " + this.server);
    let agent: HttpsProxyAgent<string> | undefined = undefined;

    if (process.env.http_proxy) {
      console.log(`Using proxy ${process.env.http_proxy}`);
      agent = new HttpsProxyAgent(process.env.http_proxy);
    }

    return new Promise((resolve, reject) => {
      // Attach every listener — crucially "error" — synchronously in the same
      // tick as construction, so a failed handshake can never surface as an
      // unhandled "error" event (which Node throws as an uncaught exception).
      let settled = false;
      const socket = new WebSocket(this.server, { agent });
      this.socket = socket;

      socket.on("message", (data) => {
        const message = Codec.stripMessageType(data as Buffer);
        this.messagesSubject.next(message);
      });

      socket.onerror = (event) => {
        this.errorSubject.next(event);
        console.log("websocker onerror", event);
      };
      socket.onclose = (event) => {
        this.errorSubject.next(event);
      };
      socket.on("close", () => {
        this.errorSubject.next(null);
        // A close before "open" means the handshake failed; settle the promise
        // so init() doesn't hang waiting for a connection that never opens.
        if (!settled) {
          settled = true;
          reject(new Error("Majsoul websocket closed before opening"));
        }
      });
      socket.on("error", (e) => {
        this.errorSubject.next(e);
        console.log("websocket error", e);
        // Reject so init() fails fast and callers can retry, instead of
        // hanging forever waiting for an "open" a failed handshake never sends.
        if (!settled) {
          settled = true;
          reject(e);
        }
      });
      socket.on("open", () => {
        settled = true;
        resolve();
      });
    });
  }

  public send(type: MessageType, data: Uint8Array): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("Connection is not opened");
    }

    this.socket.send(Codec.addMessageType(type, data));
  }

  public close() {
    this.socket?.terminate();
  }
}
