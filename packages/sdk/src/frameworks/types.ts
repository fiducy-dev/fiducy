import type { IncomingMessage } from 'node:http';

export interface NodeRequest extends IncomingMessage {
  originalUrl?: string;
  body?: unknown;
}

export interface FiducyRequestHandler {
  handler: (request: Request) => Promise<Response>;
  basePath?: string;
}

export interface RequestContext {
  request: Request;
}

export type ContextHandler = (context: RequestContext) => Promise<Response>;

export interface NuxtEventLike {
  node: { req: NodeRequest };
  req?: unknown;
}

export interface SvelteKitEventLike {
  request: Request;
  url: URL;
}

export interface SvelteKitHandleInput<Event extends SvelteKitEventLike> {
  event: Event;
  resolve: (event: Event) => Response | Promise<Response>;
  fiducy: FiducyRequestHandler;
}
