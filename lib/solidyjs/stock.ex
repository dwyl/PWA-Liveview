defmodule Solidyjs.Stock do
  @table_name :stock

  def get_stock do
    case :ets.lookup(@table_name, :stock) do
      [{:stock, value, state}] -> {value, state}
      [] -> init_stock()
    end
  end

  # lowest wins
  def update_stock(value, y_state) do
    {current_value, _} = get_stock()

    if value < current_value do
      :ets.insert(@table_name, {:stock, value, y_state})
      :ok = Phoenix.PubSub.broadcast(:pubsub, "stock", {:y_update, value, y_state})
    end
  end

  defp init_stock do
    value = 20
    state = []
    :ets.insert(@table_name, {:stock, value, state})
    {value, state}
  end
end
