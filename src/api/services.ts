/**
 * Runtime & business-service operations over adt-ls's custom LSP segments: run an
 * executable ABAP object (`adtLs/run`) and inspect/publish a service binding
 * (`adtLs/businessservice/srvb`). Each resolves the object to its repotree AFF URI.
 *
 * `publishServiceBinding` is a mutation; the library does NOT gate it (consumer policy —
 * ADR-0012).
 */
import type { LspClient } from '../driver.js';
import type { Lifecycle, ObjectRef } from './lifecycle.js';
import { readFile } from './repository.js';

export interface ServicesDeps {
  lsp: LspClient;
  /** Reused for name → repotree AFF URI (carries the destination). */
  lifecycle: Pick<Lifecycle, 'resolveAffUri'>;
}

/** Runtime + business-service surface (the `services` namespace). */
export interface Services {
  /** Run an executable object (classrun / program) and return its console output. */
  runApplication(ref: ObjectRef): Promise<{ output: string }>;
  /** Read a service binding's details (binding type, OData version, service list). */
  serviceBindingDetails(ref: ObjectRef): Promise<unknown>;
  /** Publish (or unpublish) a service binding — mutating. */
  publishServiceBinding(ref: ObjectRef): Promise<unknown>;
}

export function createServices(deps: ServicesDeps): Services {
  const { lsp, lifecycle } = deps;

  // The srvb segment loads the binding from the SFS; on an object not yet touched this
  // session the SFS hasn't materialized it, and the call fails with "Unsupported Object
  // Type". readFile populates the SFS first. Verified live on a4h.
  async function resolveAndLoad(ref: ObjectRef): Promise<string> {
    const lsUri = await lifecycle.resolveAffUri(ref);
    await readFile(lsp, lsUri).catch(() => {}); // best-effort SFS warm-up
    return lsUri;
  }

  return {
    /**
     * Run an executable ABAP object — a class implementing `if_oo_adt_classrun` (the "ABAP
     * Application (Console)" run target) or an executable program — and return its console
     * output. The object must expose the classrun/programrun discovery relation.
     */
    async runApplication(ref: ObjectRef): Promise<{ output: string }> {
      const uri = await lifecycle.resolveAffUri(ref);
      // Single-string param (matches adtLs/destinations/ensureLoggedOn convention).
      const output = await lsp.sendRequest<string>('adtLs/run/runApplication', uri);
      return { output: output ?? '' };
    },

    /** Read a service binding's details (type, OData version, service list, object data). */
    async serviceBindingDetails(ref: ObjectRef): Promise<unknown> {
      const lsUri = await resolveAndLoad(ref);
      return lsp.sendRequest('adtLs/businessservice/srvb/getServiceBindingDetails', { lsUri });
    },

    /**
     * Publish (or unpublish) a service binding — adt-ls toggles based on the binding's
     * current published state. Mutating. Returns `{isExecuted, isPublishSuccess,
     * statusMessage}`.
     */
    async publishServiceBinding(ref: ObjectRef): Promise<unknown> {
      const lsUri = await resolveAndLoad(ref);
      return lsp.sendRequest('adtLs/businessservice/srvb/publishandUnpublishAction', { lsUri });
    },
  };
}
