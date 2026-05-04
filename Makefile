.PHONY: check chat-check chat-live

check:
	python3 scripts/agent_check.py


chat-check:
	python3 scripts/chat_check.py

chat-live:
	python3 scripts/chat_check.py --live
