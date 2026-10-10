"""Lossless private handoff of Hermes history between patient turns."""
from copy import deepcopy
import json

HISTORY_KEY = "pab_native_policy_history_v1"


def model_visible_budget_messages(messages):
    """Exclude numeric training bookkeeping only from the preflight estimate."""
    bookkeeping = {'prompt_token_ids', 'generation_token_ids', 'generation_log_probs', 'routed_experts'}
    return [{k: v for k, v in m.items() if k not in bookkeeping} for m in messages]


def install_training_budget_estimator(module):
    original = module.estimate_request_tokens_rough
    if getattr(original, '_pab_training_aware', False):
        return

    def estimate(messages, **kwargs):
        return original(model_visible_budget_messages(messages), **kwargs)

    estimate._pab_training_aware = True
    module.estimate_request_tokens_rough = estimate


def pack_history(messages, consumed_inputs):
    if not isinstance(messages, list) or not messages:
        raise ValueError("Missing native policy history")
    if any(not isinstance(m, dict) or not m.get("role") for m in messages):
        raise ValueError("Malformed native policy history")
    if type(consumed_inputs) is not int or consumed_inputs < 0:
        raise ValueError("Invalid consumed input count")
    return json.dumps({"version": 1, "messages": messages,
                       "consumed_inputs": consumed_inputs}, ensure_ascii=False)


def restore_history(encoded, rendered_history):
    payload = json.loads(encoded)
    if payload.get("version") != 1:
        raise ValueError("Unsupported native history version")
    messages, consumed = payload["messages"], payload["consumed_inputs"]
    pack_history(messages, consumed)
    if consumed > len(rendered_history):
        raise ValueError("Native history cursor exceeds input history")
    suffix = rendered_history[consumed:]
    if any(m.get("role") != "user" for m in suffix):
        raise ValueError("Only new patient/runtime messages may follow native history")
    return deepcopy(messages) + deepcopy(suffix)


def invocation_outputs(observations):
    """Select actual new replies and tool results, independent of history length."""
    if observations.get('gaps') or not observations.get('records'):
        raise ValueError('Incomplete invocation capture')
    records = observations['records']
    committed = []
    for index, record in enumerate(records):
        disposition = record.get('disposition')
        if disposition == 'hermes_reasoning_only_retry':
            from health_eval_env.assistant_observations import reasoning_only_stop
            conversation = record['conversation']
            raw = record.get('api_response') or {}
            choices = raw.get('choices') or []
            calls = record.get('model_calls') or []
            if (not conversation or not reasoning_only_stop(conversation[-1])
                    or len(choices) != 1 or choices[0].get('finish_reason') != 'stop'
                    or len(calls) != 1 or calls[0].get('response_id') != raw.get('id')
                    or index + 1 == len(records)
                    or records[index + 1]['conversation'][:-1] != conversation[:-1]):
                raise ValueError('Invalid captured reasoning-only retry')
            # The rejected branch remains in raw/jury evidence, not in the
            # contiguous optimizer trajectory that Hermes actually continued.
            continue
        if disposition is not None:
            raise ValueError('Unknown captured response disposition')
        committed.append(record)
    records = committed
    outputs = []
    for index, record in enumerate(records):
        conversation = record['conversation']
        assistant = conversation[-1]
        if assistant.get('role') != 'assistant':
            raise ValueError('Missing captured assistant response')
        outputs.append(deepcopy(assistant))
        calls = assistant.get('tool_calls') or []
        if calls:
            if index + 1 == len(records):
                raise ValueError('Unfinished tool invocation')
            following = records[index + 1]['conversation']
            for call in calls:
                matches = [m for m in following if m.get('role') == 'tool' and m.get('tool_call_id') == call['id']]
                if len(matches) != 1:
                    raise ValueError('Missing or ambiguous tool result')
                outputs.append(deepcopy(matches[0]))
    return outputs


def configure_lossless_compression(agent, context_tokens, output_tokens):
    if not 0 < output_tokens < context_tokens:
        raise ValueError('Invalid context/output budget')
    compressor = agent.context_compressor
    compressor.context_length = context_tokens
    compressor.threshold_tokens = context_tokens - output_tokens
    compressor.threshold_percent = compressor.threshold_tokens / context_tokens
    original = compressor._generate_summary

    def checked_summary(*args, **kwargs):
        summary = original(*args, **kwargs)
        if not isinstance(summary, str) or not summary.strip():
            raise RuntimeError('Compression produced no summary; refusing to drop history')
        return summary

    compressor._generate_summary = checked_summary
