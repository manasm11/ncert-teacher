-- Add message_count column to conversations table
-- This column tracks the number of messages in each conversation for quick display

alter table public.conversations
    add column if not exists message_count integer not null default 0;

-- Create a function to update message count when messages are inserted/deleted
create or replace function public.update_conversation_message_count()
returns trigger as $$
begin
    if TG_OP = 'INSERT' then
        update public.conversations
            set message_count = message_count + 1,
                updated_at = now()
            where id = NEW.conversation_id;
        return NEW;
    elsif TG_OP = 'DELETE' then
        update public.conversations
            set message_count = message_count - 1,
                updated_at = now()
            where id = OLD.conversation_id;
        return OLD;
    end if;
    return null;
end;
$$ language plpgsql;

-- Create trigger to auto-update message count on insert
create trigger update_conversation_message_count_on_insert
    after insert on public.messages
    for each row
    execute function public.update_conversation_message_count();

-- Create trigger to auto-update message count on delete
create trigger update_conversation_message_count_on_delete
    after delete on public.messages
    for each row
    execute function public.update_conversation_message_count();

-- Create a function to initialize message count for existing conversations
create or replace function public.initialize_conversation_message_counts()
returns void as $$
begin
    update public.conversations c
    set message_count = (
        select count(*)
        from public.messages m
        where m.conversation_id = c.id
    );
end;
$$ language plpgsql;

-- Initialize message counts for existing data
select public.initialize_conversation_message_counts();
