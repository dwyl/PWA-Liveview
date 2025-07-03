defmodule LiveviewPwa.User do
  @moduledoc """
  This module provides functions to insert and lookup user tokens from an SQLite table.
  """

  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  alias LiveviewPwa.{Sql3Repo, User}
  alias LiveviewPwaWeb.Api.UserTokenController, as: ApiUserToken
  alias LiveviewPwaWeb.Endpoint
  alias Phoenix.Token

  require Logger

  schema "users" do
    field(:user_token, :string)
    field(:refresh_token, :string)
    field(:is_valid, :boolean, default: true)
    timestamps()
  end

  def changeset(%__MODULE__{} = user, attrs) do
    user
    |> cast(attrs, [:user_token, :refresh_token, :is_valid])
  end

  def create_user do
    %__MODULE__{}
    |> changeset(%{})
    |> Sql3Repo.insert!()
  end

  def lookup(user_token) do
    query = from(u in __MODULE__, where: u.user_token == ^user_token)
    Sql3Repo.one(query)
  end

  def add_token(user_id) do
    access_salt = ApiUserToken.access_salt()
    refresh_salt = ApiUserToken.refresh_salt()

    access_token =
      Token.sign(Endpoint, access_salt, user_id, max_age: ApiUserToken.access_ttl())

    refresh_token =
      Token.sign(Endpoint, refresh_salt, user_id, max_age: ApiUserToken.refresh_ttl())

    case Sql3Repo.get(__MODULE__, user_id) do
      nil ->
        {:error, :user_not_found}

      user ->
        user
        |> changeset(%{user_token: access_token, refresh_token: refresh_token})
        |> Sql3Repo.update()

        {:ok, access_token, refresh_token}
    end
  end

  def revoke(user_id_or_user_token) do
    value = "#{user_id_or_user_token}"

    User.lookup(value)
    |> case do
      nil ->
        Sql3Repo.get(__MODULE__, value)
        |> case do
          nil ->
            Logger.warning("User not found: #{value}")
            {:error, :user_not_found}

          user ->
            revoke(user.user_token)
        end

      user ->
        Logger.warning("Revoking user token: #{user.user_token}")

        {:ok, _} =
          changeset(user, %{is_valid: false}) |> Sql3Repo.update()
    end
  end

  # def update_token(user_id, user_token, refresh_token) do
  #   case Sql3Repo.get(__MODULE__, user_id) do
  #     nil ->
  #       {:error, :user_not_found}

  #     user ->
  #       user
  #       |> changeset(%{user_token: user_token, refresh_token: refresh_token})
  #       |> Sql3Repo.update()
  #   end
  # end

  # def authenticate(user_token) do
  #   user = User.lookup(user_token)
  #   salt = ApiUserToken.access_salt()
  #   max_age = ApiUserToken.access_ttl()

  #   id = user.id

  #   if not is_nil(user) and user_token === user.user_token do
  #     case Token.verify(Endpoint, salt, user_token, max_age: max_age) do
  #       {:ok, ^id} ->
  #         Logger.debug("User token verified")
  #         {:ok, id}

  #       {:error, _reason} ->
  #         case maybe_refresh_token(user) do
  #           {:ok, user_id, new_access_token, new_refresh_token} ->
  #             Logger.debug("User token refreshed")
  #             {:ok, user_id, new_access_token, new_refresh_token}

  #           {:error, reason} ->
  #             Logger.warning("Refresh expired: #{inspect(reason)}")

  #             {:error, :not_found}
  #         end
  #     end
  #   else
  #     Logger.warning("User token not found ")
  #     {:error, :not_found}
  #   end
  # end

  # def maybe_refresh_token(user) do
  #   refresh_ttl = ApiUserToken.refresh_ttl()
  #   access_ttl = ApiUserToken.access_ttl()
  #   refresh_salt = ApiUserToken.refresh_salt()
  #   access_salt = ApiUserToken.access_salt()

  #   refresh_token = user.refresh_token
  #   id = user.id

  #   case Token.verify(Endpoint, refresh_salt, refresh_token, max_age: refresh_ttl) do
  #     {:ok, ^id} ->
  #       new_access_token = Token.sign(Endpoint, access_salt, id, max_age: access_ttl)

  #       new_refresh_token =
  #         Token.sign(Endpoint, refresh_salt, id, max_age: refresh_ttl)

  #       {:ok, id, new_access_token, new_refresh_token}

  #     {:error, reason} ->
  #       {:error, reason}
  #   end
  # end
end
