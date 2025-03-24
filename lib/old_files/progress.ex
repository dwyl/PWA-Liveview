# defmodule Solidyjs.Progress do
#   use Agent

#   def start_link(_) do
#     Agent.start_link(fn -> 0 end, name: __MODULE__)
#   end

#   @spec put(any()) :: :ok
#   def put(value) do
#     Agent.update(__MODULE__, fn _ -> value end)
#   end

#   def get do
#     Agent.get(__MODULE__, & &1)
#   end
# end
